const minimist = require('minimist');
const fs = require('fs');
const libpath = require('path');
const store = require('../core/store');
const market = require('../core/market');
const importer = require('../core/importer');

const DAYS_BACK = 120;

function usage() {
    console.log(`Usage: node cli/generate-daily.js --path=<yyyy-mm | yyyy-mm/dd> [options]

Generates 1d candle files for every symbol that has a 1m/5m file under --path.

Arguments:
  --path=<yyyy-mm>        process every day folder in that month
  --path=<yyyy-mm/dd>     process a single day folder

Options:
  --override[=true|false] overwrite/merge existing 1d files (default: true)
  --no-override           same as --override=false: skip symbols whose 1d file
                          already exists for that month
  -h, --help              show this help

Examples:
  node cli/generate-daily.js --path=2026-04
  node cli/generate-daily.js --path=2026-04/29 --no-override`);
}

function die(msg) {
    console.error(`Error: ${msg}`);
    process.exit(1);
}

function pad(n) { return String(n).padStart(2, '0'); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function listTargets(path) {
    const m1 = path.match(/^(\d{4}-\d{2})$/);
    const m2 = path.match(/^(\d{4}-\d{2})\/(\d{2})$/);
    let ym, dayFilter = null;
    if (m1) ym = m1[1];
    else if (m2) { ym = m2[1]; dayFilter = m2[2]; }
    else throw new Error('--path must be yyyy-mm or yyyy-mm/dd');

    const monthDir = libpath.join(store.DATA_DIR, ym);
    if (!fs.existsSync(monthDir)) throw new Error(`path not found: ${monthDir}`);

    const days = dayFilter
        ? [dayFilter]
        : fs.readdirSync(monthDir).filter(n => /^\d{2}$/.test(n)).sort();

    const seen = new Set();
    const out = [];
    for (const dd of days) {
        const dir = libpath.join(monthDir, dd);
        if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
        for (const name of fs.readdirSync(dir)) {
            const meta = store.parseFileName(name);
            if (!meta) continue;
            if (meta.timeframe !== '1m' && meta.timeframe !== '5m') continue;
            const key = `${meta.symbol}|${ym}|${dd}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ ym, dd, symbol: meta.symbol });
        }
    }
    return out;
}

async function main() {
    const argv = minimist(process.argv.slice(2), { boolean: ['help'], alias: { h: 'help' } });
    if (argv.help) { usage(); process.exit(0); }
    const path = argv.path;
    if (!path) { usage(); die('--path required (yyyy-mm or yyyy-mm/dd)'); }

    const override = argv.override === undefined
        ? true
        : (argv.override !== false && argv.override !== 'false');

    let targets;
    try { targets = listTargets(String(path)); }
    catch (e) { die(e.message); }

    if (!targets.length) {
        console.log('No 1m/5m files found.');
        process.exit(0);
    }

    console.log(`Found ${targets.length} (symbol, day) target(s).`);

    let ok = 0, fail = 0, skipped = 0;
    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const [yy, mm] = t.ym.split('-').map(Number);
        const endStr = `${yy}-${pad(mm)}-${t.dd} 23:59`;
        const startUtc = new Date(Date.UTC(yy, mm - 1, Number(t.dd) - DAYS_BACK));
        const startStr = `${startUtc.getUTCFullYear()}-${pad(startUtc.getUTCMonth() + 1)}-${pad(startUtc.getUTCDate())} 00:00`;
        const fromMs = market.parseNYLocal(startStr).getTime();
        const toMs = market.parseNYLocal(endStr).getTime();

        if (!override) {
            const existing = store.findExistingFile(t.symbol, '1d', market.ymOfMs(toMs));
            if (existing) {
                console.log(`\n${t.symbol} 1d SKIP (exists) ${existing}`);
                skipped++;
                continue;
            }
        }

        if (i > 0) await sleep(2000);
        console.log(`\n${t.symbol} 1d ${startStr} -> ${endStr}`);
        try {
            const r = await importer.importRange({ symbol: t.symbol, timeframe: '1d', fromMs, toMs });
            console.log(`  OK fetched=${r.fetched} total=${r.total} added=${r.added} replaced=${r.replaced} ${r.path}`);
            ok++;
        } catch (e) {
            console.error(`  ERROR ${e.message}`);
            fail++;
        }
    }
    console.log(`\nDone: ok=${ok} fail=${fail} skipped=${skipped}`);
    process.exit(fail ? 1 : 0);
}

main();
