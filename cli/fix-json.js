const minimist = require('minimist');
const fs = require('fs');
const libpath = require('path');
const store = require('../core/store');
const market = require('../core/market');

function die(msg) {
    console.error(`Error: ${msg}`);
    process.exit(1);
}

function readJson(p) {
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, 'utf8');
    if (!txt.trim()) return null;
    return JSON.parse(txt);
}

function writeJsonAtomic(p, data, pretty) {
    fs.mkdirSync(libpath.dirname(p), { recursive: true });
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data));
    fs.renameSync(tmp, p);
}

function listDaysInMonth(ym) {
    const monthDir = libpath.join(store.DATA_DIR, ym);
    if (!fs.existsSync(monthDir)) return [];
    return fs.readdirSync(monthDir)
        .filter(n => /^\d{2}$/.test(n) && fs.statSync(libpath.join(monthDir, n)).isDirectory())
        .sort();
}

function nextMonth(ym) {
    let [y, m] = ym.split('-').map(Number);
    m++;
    if (m > 12) { m = 1; y++; }
    return `${y}-${String(m).padStart(2, '0')}`;
}

function dayRange(startYm, startDd, endYm, endDd) {
    const startKey = `${startYm}/${startDd}`;
    const endKey = `${endYm}/${endDd}`;
    const out = [];
    let curYm = startYm;
    while (curYm <= endYm) {
        for (const dd of listDaysInMonth(curYm)) {
            const key = `${curYm}/${dd}`;
            if (key >= startKey && key < endKey) out.push({ ym: curYm, dd });
        }
        if (curYm === endYm) break;
        curYm = nextMonth(curYm);
    }
    return out;
}

function listCandleFiles(ym, dd) {
    const dir = libpath.join(store.DATA_DIR, ym, dd);
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const meta = store.parseFileName(name);
        if (!meta) continue;
        if (meta.timeframe !== '1m' && meta.timeframe !== '5m') continue;
        out.push({ name, ...meta });
    }
    return out;
}

function mergeCandleStrays(ym, dd, name) {
    const currentAbs = libpath.join(store.DATA_DIR, ym, dd, name);
    let currentCandles = store.readCandles(currentAbs);
    if (!currentCandles.length) return { mergedFiles: 0, added: 0, replaced: 0 };

    const firstMs = currentCandles[0][0] * 1000;
    const startYm = market.ymOfMs(firstMs);
    const startDd = market.ddOfMs(firstMs);
    const earlierDays = dayRange(startYm, startDd, ym, dd);

    let mergedFiles = 0, added = 0, replaced = 0;
    for (const e of earlierDays) {
        const oldAbs = libpath.join(store.DATA_DIR, e.ym, e.dd, name);
        if (!fs.existsSync(oldAbs)) continue;
        const oldCandles = store.readCandles(oldAbs);
        const r = store.mergeCandles(oldCandles, currentCandles);
        currentCandles = r.merged;
        added += oldCandles.length - r.replaced;
        replaced += r.replaced;
        fs.unlinkSync(oldAbs);
        mergedFiles++;
        console.log(`  MERGED candles ${e.ym}/${e.dd}/${name} (${oldCandles.length} bars) -> ${ym}/${dd}/${name}`);
    }

    if (mergedFiles > 0) {
        const meta = store.parseFileName(name);
        const newAbs = store.pathFor(meta.symbol, meta.timeframe, currentCandles);
        if (newAbs !== currentAbs && fs.existsSync(currentAbs)) fs.unlinkSync(currentAbs);
        store.writeCandlesAtomic(newAbs, currentCandles);
    }
    return { mergedFiles, added, replaced };
}

function mergeStockinfoStrays(ym, dd, name) {
    const currentAbs = libpath.join(store.DATA_DIR, ym, dd, name);
    const currentCandles = store.readCandles(currentAbs);
    if (!currentCandles.length) return { movedFrom: 0, fieldsAdded: 0 };

    const firstMs = currentCandles[0][0] * 1000;
    const startYm = market.ymOfMs(firstMs);
    const startDd = market.ddOfMs(firstMs);

    const currentPath = store.stockinfoPathFor(ym, dd);
    let current = readJson(currentPath);
    if (!Array.isArray(current)) current = [];
    let curIdx = current.findIndex(e => e && e.filename === name);

    const earlierDays = dayRange(startYm, startDd, ym, dd);
    let movedFrom = 0, fieldsAdded = 0, modifiedCurrent = false;

    for (const e of earlierDays) {
        const oldPath = store.stockinfoPathFor(e.ym, e.dd);
        const oldList = readJson(oldPath);
        if (!Array.isArray(oldList)) continue;
        const oldIdx = oldList.findIndex(en => en && en.filename === name);
        if (oldIdx < 0) continue;
        const oldEntry = oldList[oldIdx];

        if (curIdx < 0) {
            current.push({ ...oldEntry });
            curIdx = current.length - 1;
            fieldsAdded += Object.keys(oldEntry).length;
        } else {
            const existing = current[curIdx];
            for (const k of Object.keys(oldEntry)) {
                if (existing[k] === undefined || existing[k] === null) {
                    existing[k] = oldEntry[k];
                    fieldsAdded++;
                }
            }
        }
        modifiedCurrent = true;

        oldList.splice(oldIdx, 1);
        if (oldList.length === 0) {
            fs.unlinkSync(oldPath);
            console.log(`  REMOVED empty ${e.ym}/${e.dd}/stockinfo.json`);
        } else {
            writeJsonAtomic(oldPath, oldList, true);
        }
        movedFrom++;
        console.log(`  MOVED stockinfo entry for ${name} from ${e.ym}/${e.dd} -> ${ym}/${dd}`);
    }

    if (modifiedCurrent) writeJsonAtomic(currentPath, current, true);
    return { movedFrom, fieldsAdded };
}

async function main() {
    const argv = minimist(process.argv.slice(2));
    const pathArg = argv.path;
    if (!pathArg) die('--path required (yyyy-mm or yyyy-mm/dd)');

    const m1 = String(pathArg).match(/^(\d{4}-\d{2})$/);
    const m2 = String(pathArg).match(/^(\d{4}-\d{2})\/(\d{2})$/);
    let ym, dayFilter = null;
    if (m1) ym = m1[1];
    else if (m2) { ym = m2[1]; dayFilter = m2[2]; }
    else die('--path must be yyyy-mm or yyyy-mm/dd');

    const monthDir = libpath.join(store.DATA_DIR, ym);
    if (!fs.existsSync(monthDir)) die(`path not found: ${monthDir}`);

    const days = (dayFilter ? [dayFilter] : listDaysInMonth(ym)).slice().sort().reverse();

    let totalCandleFiles = 0, totalStockinfoMoved = 0, totalFieldsAdded = 0;
    for (const dd of days) {
        const files = listCandleFiles(ym, dd);
        if (!files.length) continue;
        for (const f of files) {
            console.log(`\n=== ${ym}/${dd}/${f.name} ===`);
            const cr = mergeCandleStrays(ym, dd, f.name);
            totalCandleFiles += cr.mergedFiles;
            const sr = mergeStockinfoStrays(ym, dd, f.name);
            totalStockinfoMoved += sr.movedFrom;
            totalFieldsAdded += sr.fieldsAdded;
        }
    }

    console.log(`\nDone: candleStraysMerged=${totalCandleFiles} stockinfoEntriesMoved=${totalStockinfoMoved} fieldsAdded=${totalFieldsAdded}`);
}

main().catch(e => die(e.stack || e.message));
