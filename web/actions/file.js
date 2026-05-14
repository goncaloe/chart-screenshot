const path = require('path');
const store = require('../../core/store');

function getFile(ym, dd, name) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    if (!/^\d{2}$/.test(dd)) throw new Error('Invalid dd');
    const f = store.loadFile(ym, dd, name);
    const ranges = store.computeRanges(f.candles, f.timeframe);
    return {
        ym: f.ym,
        dd: f.dd,
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

async function postDeleteRange(req, res) {
    try {
        const { ym, dd, name, fromTs, toTs } = req.body || {};
        if (!/^\d{4}-\d{2}$/.test(ym || '')) return res.status(400).json({ error: 'invalid ym' });
        if (!/^\d{2}$/.test(dd || '')) return res.status(400).json({ error: 'invalid dd' });
        if (!store.parseFileName(name || '')) return res.status(400).json({ error: 'invalid filename' });
        const from = Number(fromTs);
        const to = Number(toTs);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
            return res.status(400).json({ error: 'invalid range' });
        }
        const abs = path.join(store.DATA_DIR, ym, dd, name);
        const existing = store.readCandles(abs);
        const kept = existing.filter(c => c[0] < from || c[0] > to);
        const removed = existing.length - kept.length;
        store.writeCandlesAtomic(abs, kept);
        res.json({ ok: true, removed, total: kept.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { getFile, postDeleteRange };
