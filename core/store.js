const fs = require('fs');
const path = require('path');
const { ymOfMs, timeframeSeconds, isMarketOpen } = require('./market');

const DATA_DIR = path.resolve(__dirname, '..', 'data');

function fileName(symbol, tf) {
    return `${symbol.toUpperCase()}_${tf}.json`;
}

function parseFileName(name) {
    const m = name.match(/^([A-Z0-9.\-]+)_(1m|5m|1d)\.json$/i);
    if (!m) return null;
    return { symbol: m[1].toUpperCase(), timeframe: m[2].toLowerCase() };
}

function pathFor(symbol, tf, endMs) {
    return path.join(DATA_DIR, ymOfMs(endMs), fileName(symbol, tf));
}

function readCandles(absPath) {
    if (!fs.existsSync(absPath)) return [];
    const txt = fs.readFileSync(absPath, 'utf8');
    if (!txt.trim()) return [];
    const data = JSON.parse(txt);
    if (!Array.isArray(data)) throw new Error(`Invalid file shape: ${absPath}`);
    return data;
}

function writeCandlesAtomic(absPath, candles) {
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    const tmp = absPath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(candles));
    fs.renameSync(tmp, absPath);
}

function mergeCandles(existing, incoming) {
    const map = new Map();
    for (const c of existing) map.set(c[0], c);
    let added = 0, replaced = 0;
    for (const c of incoming) {
        if (map.has(c[0])) replaced++;
        else added++;
        map.set(c[0], c);
    }
    const merged = [...map.values()].sort((a, b) => a[0] - b[0]);
    return { merged, added, replaced };
}

function listFolders() {
    if (!fs.existsSync(DATA_DIR)) return [];
    return fs.readdirSync(DATA_DIR)
        .filter(n => /^\d{4}-\d{2}$/.test(n) && fs.statSync(path.join(DATA_DIR, n)).isDirectory())
        .sort()
        .reverse();
}

function listFiles(ym) {
    const dir = path.join(DATA_DIR, ym);
    if (!fs.existsSync(dir)) return [];
    const out = [];
    for (const name of fs.readdirSync(dir)) {
        const meta = parseFileName(name);
        if (!meta) continue;
        const abs = path.join(dir, name);
        const stat = fs.statSync(abs);
        let candles = [];
        try { candles = readCandles(abs); } catch { continue; }
        out.push({
            name,
            symbol: meta.symbol,
            timeframe: meta.timeframe,
            size: stat.size,
            count: candles.length,
            firstTs: candles.length ? candles[0][0] : null,
            lastTs: candles.length ? candles[candles.length - 1][0] : null,
            candles
        });
    }
    out.sort((a, b) => (a.lastTs ?? -Infinity) - (b.lastTs ?? -Infinity));
    return out;
}

function loadFile(ym, name) {
    const meta = parseFileName(name);
    if (!meta) throw new Error(`Invalid file name: ${name}`);
    const abs = path.join(DATA_DIR, ym, name);
    const candles = readCandles(abs);
    return { ...meta, ym, name, candles, count: candles.length, path: abs };
}

function computeRanges(candles, tf) {
    const step = timeframeSeconds(tf);
    const sorted = [...candles].sort((a, b) => a[0] - b[0]);
    const ranges = [];
    let start = null, prev = null, count = 0;
    for (const c of sorted) {
        const ts = c[0];
        if (prev !== null && ts === prev) continue;
        if (prev === null) {
            start = ts; prev = ts; count = 1;
            continue;
        }
        if (ts === nextExpected(prev, step, tf)) {
            prev = ts; count++;
        } else {
            ranges.push({ startTs: start, endTs: prev, count });
            start = ts; prev = ts; count = 1;
        }
    }
    if (prev !== null) ranges.push({ startTs: start, endTs: prev, count });
    return ranges;
}

function nextExpected(ts, step, tf) {
    if (tf === '1d') return ts + step;
    let cur = ts + step;
    while (!isMarketOpen(cur)) cur += step;
    return cur;
}

module.exports = {
    DATA_DIR,
    fileName,
    parseFileName,
    pathFor,
    readCandles,
    writeCandlesAtomic,
    mergeCandles,
    listFolders,
    listFiles,
    loadFile,
    computeRanges
};
