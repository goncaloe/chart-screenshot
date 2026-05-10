const store = require('../../core/store');

function getFile(ym, name) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    const f = store.loadFile(ym, name);
    const ranges = store.computeRanges(f.candles, f.timeframe);
    return {
        ym: f.ym,
        name: f.name,
        symbol: f.symbol,
        timeframe: f.timeframe,
        count: f.count,
        firstTs: f.candles.length ? f.candles[0][0] : null,
        lastTs: f.candles.length ? f.candles[f.candles.length - 1][0] : null,
        ranges,
        candles: f.candles
    };
}

module.exports = { getFile };
