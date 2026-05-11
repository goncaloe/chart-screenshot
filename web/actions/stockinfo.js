const fs = require('fs');
const path = require('path');
const store = require('../../core/store');
const dilutionFetch = require('../../core/dilution');

function pad(n) { return String(n).padStart(2, '0'); }

async function postFetchMeta(req, res) {
    try {
        const { ym, day, filename } = req.body || {};
        if (!/^\d{4}-\d{2}$/.test(ym || '')) return res.status(400).json({ error: 'invalid ym' });
        const d = Number(day);
        if (!Number.isInteger(d) || d < 1 || d > 31) return res.status(400).json({ error: 'invalid day' });
        const meta = store.parseFileName(filename || '');
        if (!meta) return res.status(400).json({ error: 'invalid filename' });

        const info = await dilutionFetch(meta.symbol);
        if (!info) return res.status(404).json({ error: `no dilution data for ${meta.symbol}` });

        const dir = path.join(store.DATA_DIR, ym);
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `stockinfo-${pad(d)}.json`);

        let list = [];
        if (fs.existsSync(filePath)) {
            const txt = fs.readFileSync(filePath, 'utf8');
            if (txt.trim()) list = JSON.parse(txt);
            if (!Array.isArray(list)) throw new Error(`Invalid file shape: ${filePath}`);
        }

        const idx = list.findIndex(r => r && r.filename === filename);
        if (idx >= 0) list[idx] = { ...info, ...list[idx] };
        else list.push({ filename, ...info });

        const tmp = filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
        fs.renameSync(tmp, filePath);

        res.json({ ok: true, entry: idx >= 0 ? list[idx] : list[list.length - 1] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { postFetchMeta };
