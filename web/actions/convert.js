const path = require('path');
const store = require('../../core/store');

function aggregate1mTo5m(candles1m) {
    const buckets = new Map();
    for (const c of candles1m) {
        const bucket = Math.floor(c[0] / 300) * 300;
        const existing = buckets.get(bucket);
        if (!existing) {
            buckets.set(bucket, [bucket, c[1], c[2], c[3], c[4], c[5]]);
        } else {
            existing[2] = Math.max(existing[2], c[2]);
            existing[3] = Math.min(existing[3], c[3]);
            existing[4] = c[4];
            existing[5] += c[5];
        }
    }
    return [...buckets.values()].sort((a, b) => a[0] - b[0]);
}

async function postConvertTo5m(req, res) {
    try {
        const { ym, dd, name } = req.body || {};
        if (!/^\d{4}-\d{2}$/.test(ym || '')) return res.status(400).json({ error: 'invalid ym' });
        if (!/^\d{2}$/.test(dd || '')) return res.status(400).json({ error: 'invalid dd' });
        const meta = store.parseFileName(name || '');
        if (!meta) return res.status(400).json({ error: 'invalid filename' });
        if (meta.timeframe !== '1m') return res.status(400).json({ error: 'source must be 1m' });

        const src = store.loadFile(ym, dd, name);
        if (!src.candles.length) return res.status(400).json({ error: 'source file is empty' });

        const aggregated = aggregate1mTo5m(src.candles);
        const destName = store.fileName(meta.symbol, '5m');
        const destPath = path.join(store.DATA_DIR, ym, dd, destName);
        const existing = store.readCandles(destPath);
        const { merged, added, replaced } = store.mergeCandles(existing, aggregated);
        store.writeCandlesAtomic(destPath, merged);

        res.json({ ok: true, ym, dd, name: destName, added, replaced, total: merged.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { postConvertTo5m };
