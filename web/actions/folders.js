const store = require('../../core/store');

function listFolders(req, res) {
    res.json({ folders: store.listFolders() });
}

function listFiles(req, res) {
    const ym = req.params.ym;
    if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'Invalid ym' });
    const files = store.listFiles(ym).map(f => ({
        name: f.name,
        symbol: f.symbol,
        timeframe: f.timeframe,
        size: f.size,
        count: f.count,
        firstTs: f.firstTs,
        lastTs: f.lastTs,
        candles: f.candles
    }));
    res.json({ ym, files });
}

module.exports = { listFolders, listFiles };
