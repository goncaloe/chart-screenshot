const store = require('../../core/store');

function getFile(req, res) {
    const { ym, name } = req.params;
    if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'Invalid ym' });
    try {
        const f = store.loadFile(ym, name);
        const ranges = store.computeRanges(f.candles, f.timeframe);
        res.json({
            ym: f.ym,
            name: f.name,
            symbol: f.symbol,
            timeframe: f.timeframe,
            count: f.count,
            firstTs: f.candles.length ? f.candles[0][0] : null,
            lastTs: f.candles.length ? f.candles[f.candles.length - 1][0] : null,
            ranges,
            candles: f.candles
        });
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
}

module.exports = { getFile };
