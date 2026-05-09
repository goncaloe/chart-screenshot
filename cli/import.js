const minimist = require('minimist');
const market = require('../core/market');
const importer = require('../core/importer');

function die(msg) {
    console.error(`Error: ${msg}`);
    process.exit(1);
}

async function main() {
    const argv = minimist(process.argv.slice(2));
    const symbol = argv.symbol;
    const timeframe = argv.timeframe;
    const from = argv.from;
    const to = argv.to;

    if (!symbol) die('--symbol required');
    if (!timeframe) die('--timeframe required (1m|5m|1d)');
    if (!from) die('--from required (NY local "YYYY-MM-DD HH:MM")');
    if (!to) die('--to required (NY local "YYYY-MM-DD HH:MM")');
    try { market.tfMeta(timeframe); } catch (e) { die(e.message); }

    let fromMs, toMs;
    try {
        fromMs = market.parseNYLocal(from).getTime();
        toMs = market.parseNYLocal(to).getTime();
    } catch (e) { die(e.message); }
    if (toMs <= fromMs) die('to must be after from');

    console.log(`Importing ${symbol} ${timeframe} from ${from} to ${to} (NY)`);
    try {
        const r = await importer.importRange({ symbol, timeframe, fromMs, toMs });
        console.log(`OK ${r.path}`);
        console.log(`  fetched=${r.fetched} kept=${r.kept} added=${r.added} replaced=${r.replaced} total=${r.total}`);
        process.exit(0);
    } catch (e) {
        die(e.stack || e.message);
    }
}

main();
