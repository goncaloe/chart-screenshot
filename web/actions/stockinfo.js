const fs = require('fs');
const path = require('path');
const store = require('../../core/store');
const dilutionFetch = require('../../core/dilution');

async function postFetchInfo(req, res) {
    try {
        const { ym, day, filename } = req.body || {};
        if (!/^\d{4}-\d{2}$/.test(ym || '')) return res.status(400).json({ error: 'invalid ym' });
        const d = Number(day);
        if (!Number.isInteger(d) || d < 1 || d > 31) return res.status(400).json({ error: 'invalid day' });
        const info = store.parseFileName(filename || '');
        if (!info) return res.status(400).json({ error: 'invalid filename' });

        const dinfo = await dilutionFetch(info.symbol);
        if (!dinfo) return res.status(404).json({ error: `no dilution data for ${info.symbol}` });

        const filePath = store.stockinfoPathFor(ym, d);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        let list = [];
        if (fs.existsSync(filePath)) {
            const txt = fs.readFileSync(filePath, 'utf8');
            if (txt.trim()) list = JSON.parse(txt);
            if (!Array.isArray(list)) throw new Error(`Invalid file shape: ${filePath}`);
        }

        const idx = list.findIndex(r => r && r.filename === filename);
        if (idx >= 0) list[idx] = { ...dinfo, ...list[idx] };
        else list.push({ filename, ...dinfo });

        const tmp = filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(list, null, 2));
        fs.renameSync(tmp, filePath);

        res.json({ ok: true, entry: idx >= 0 ? list[idx] : list[list.length - 1] });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}

function pad(n) { return String(n).padStart(2, '0'); }

function postPrintBounds(req, res) {
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
        entry[`print_start_${timeframe}`] = datestart;
        entry[`print_end_${timeframe}`] = dateend;

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

module.exports = { postFetchInfo, postPrintBounds };
