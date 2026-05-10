const store = require('../../core/store');

function getFolders() {
    return { folders: store.listFolders() };
}

function getFiles(ym) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
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
    return { ym, files };
}

module.exports = { getFolders, getFiles };
