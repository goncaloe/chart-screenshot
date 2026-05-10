const store = require('../../core/store');
const { nyDateKey } = require('../../core/market');

function getFolders() {
    return { folders: store.listFolders() };
}

function getFiles(ym, day) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    const selectedDay = Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
    const dayKey = selectedDay ? `${ym}-${String(selectedDay).padStart(2, '0')}` : null;
    const files = store.listFiles(ym)
        .filter(f => !dayKey || f.candles.some(c => nyDateKey(c[0]) === dayKey))
        .map(f => ({
            name: f.name,
            symbol: f.symbol,
            timeframe: f.timeframe,
            size: f.size,
            count: f.count,
            firstTs: f.firstTs,
            lastTs: f.lastTs,
            candles: f.candles
        }));
    return { ym, files, day: selectedDay };
}

module.exports = { getFolders, getFiles };
