const fs = require('fs');
const path = require('path');
const store = require('../../core/store');

function pad(n) { return String(n).padStart(2, '0'); }

function postRange(req, res) {
    try {
        const { ym: ymIn, dd: ddIn, filename, timeframe, datestart, dateend } = req.body || {};
        if (!filename || !timeframe || typeof datestart !== 'number' || typeof dateend !== 'number') {
            return res.status(400).json({ error: 'filename, timeframe, datestart, dateend required' });
        }
        let ym, dd;
        if (/^\d{4}-\d{2}$/.test(ymIn || '') && /^\d{2}$/.test(ddIn || '')) {
            ym = ymIn;
            dd = ddIn;
        } else {
            const d = new Date(dateend * 1000);
            ym = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
            dd = pad(d.getUTCDate());
        }
        const filePath = store.stockinfoPathFor(ym, dd);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        let ranges = [];
        if (fs.existsSync(filePath)) {
            const txt = fs.readFileSync(filePath, 'utf8');
            if (txt.trim()) ranges = JSON.parse(txt);
            if (!Array.isArray(ranges)) throw new Error(`Invalid file shape: ${filePath}`);
        }

        const entry = { filename };
        entry[`rangestart_${timeframe}`] = datestart;
        entry[`rangeend_${timeframe}`] = dateend;

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
