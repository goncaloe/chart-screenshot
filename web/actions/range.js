const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

function pad(n) { return String(n).padStart(2, '0'); }

function postRange(req, res) {
    try {
        const { filename, datestart, dateend } = req.body || {};
        if (!filename || typeof datestart !== 'number' || typeof dateend !== 'number') {
            return res.status(400).json({ error: 'filename, datestart, dateend required' });
        }
        const d = new Date(dateend * 1000);
        const ym = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
        const dd = pad(d.getUTCDate());
        const dir = path.join(DATA_DIR, ym);
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `ranges-${dd}.json`);

        let ranges = [];
        if (fs.existsSync(filePath)) {
            const txt = fs.readFileSync(filePath, 'utf8');
            if (txt.trim()) ranges = JSON.parse(txt);
            if (!Array.isArray(ranges)) throw new Error(`Invalid file shape: ${filePath}`);
        }

        const entry = { filename, datestart, dateend };
        const idx = ranges.findIndex(r => r.filename === filename);
        if (idx >= 0) ranges[idx] = entry;
        else ranges.push(entry);

        const tmp = filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(ranges, null, 2));
        fs.renameSync(tmp, filePath);

        res.json({ ok: true, path: filePath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

module.exports = { postRange };
