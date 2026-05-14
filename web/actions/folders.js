const fs = require('fs');
const store = require('../../core/store');

function readStockinfos(ym, day) {
    const abs = store.stockinfoPathFor(ym, day);
    if (!fs.existsSync(abs)) return new Map();
    const txt = fs.readFileSync(abs, 'utf8');
    if (!txt.trim()) return new Map();
    const list = JSON.parse(txt);
    if (!Array.isArray(list)) return new Map();
    return new Map(list.map(r => {
        return [r.filename, {
            hasRange1m: (r.hasOwnProperty('rangestart_1m')),
            hasRange5m: (r.hasOwnProperty('rangestart_5m')),
            hasRange1d: (r.hasOwnProperty('rangestart_1d')),
            hasMeta: (r.hasOwnProperty('shs_float') || r.hasOwnProperty('cps') || r.hasOwnProperty('cash'))
        }]
    }));
}

function getFolders() {
    return { folders: store.listFolders() };
}

function getDays(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    return { ym, days: store.listDays(ym) };
}

function getFiles(ym, dd, timeframe) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    if (!/^\d{2}$/.test(dd)) throw new Error('Invalid dd');
    const selectedTf = ['1m', '5m', '1d'].includes(timeframe) ? timeframe : null;
    const stockinfo = readStockinfos(ym, dd);
    const files = store.listFiles(ym, dd)
        .filter(f => !selectedTf || f.timeframe === selectedTf)
        .map(f => ({
            name: f.name,
            dd: f.dd,
            symbol: f.symbol,
            timeframe: f.timeframe,
            size: f.size,
            count: f.count,
            firstTs: f.firstTs,
            lastTs: f.lastTs,
            candles: f.candles,
            hasRange: stockinfo.get(f.name)?.['hasRange' + f.timeframe] || false,
            hasMeta: stockinfo.get(f.name)?.hasMeta || false
        }));
    return { ym, dd, files, timeframe: selectedTf };
}

module.exports = { getFolders, getDays, getFiles };
