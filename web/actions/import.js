const market = require('../../core/market');
const importer = require('../../core/importer');

async function postImport(req, res) {
    try {
        const { symbol, timeframe, from, to } = req.body || {};
        if (!symbol || !timeframe || !from || !to) {
            return res.status(400).json({ error: 'symbol, timeframe, from, to required' });
        }
        market.tfMeta(timeframe);
        const fromMs = market.parseNYLocal(from).getTime();
        const toMs = market.parseNYLocal(to).getTime();
        if (toMs <= fromMs) return res.status(400).json({ error: 'to must be after from' });
        const r = await importer.importRange({ symbol, timeframe, fromMs, toMs });
        res.json(r);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { postImport };
