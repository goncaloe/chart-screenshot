const fs = require('fs');
const ib = require('./ib');
const market = require('./market');
const store = require('./store');

function marketHourSeconds(fromMs, toMs) {
    const fromSec = Math.floor(fromMs / 60000) * 60;
    const toSec = Math.ceil(toMs / 60000) * 60;
    let count = 0;
    for (let s = fromSec; s < toSec; s += 60) {
        if (market.isMarketOpen(s, true)) count += 60;
    }
    return count;
}

function marketCountDays(fromMs, toMs) {
    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.ceil(toMs / 1000);
    let count = 0;
    for (let s = fromSec; s < toSec; s += 86400) {
        if (market.isMarketOpen(s, false)) count += 1;
    }
    return Math.max(1, count);
}


function dailyTsToUnixSec(yyyymmdd) {
    const m = String(yyyymmdd).match(/^(\d{4})(\d{2})(\d{2})$/);
    if (!m) throw new Error(`Bad daily date: ${yyyymmdd}`);
    return Math.floor(market.parseNYLocal(`${m[1]}-${m[2]}-${m[3]} 00:00`).getTime() / 1000);
}

function normalizeBars(bars, tf) {
    const out = [];
    for (const b of bars) {
        let ts;
        if (tf === '1d') ts = dailyTsToUnixSec(b.date);
        else ts = parseInt(b.date, 10);
        if (!Number.isFinite(ts)) continue;
        out.push([ts, b.open, b.high, b.low, b.close, b.volume]);
    }
    return out;
}

async function fetchChunk({ contract, endMs, durationSec, tf }) {
    const meta = market.tfMeta(tf);
    const duration = `${durationSec} ${meta.durUnit}`;
    const raw = await ib.getHistoricalData({
        contract,
        endDateTime: market.formatIbEndDateTime(endMs),
        duration,
        barSizeSetting: meta.barSize,
        whatToShow: 'TRADES',
        useRth: 0,
        formatDate: 2
    });
    return normalizeBars(raw.bars || [], tf);
}

async function importRange({ symbol, timeframe, fromMs, toMs }) {
    if (toMs <= fromMs) throw new Error('to must be after from');
    const tf = timeframe;
    const meta = market.tfMeta(tf);
    const contract = ib.contractStock(symbol.toUpperCase());

    const buffer = [];
    if (tf === '1d') {
        const days = marketCountDays(fromMs, toMs);
        const raw = await ib.getHistoricalData({
            contract,
            endDateTime: market.formatIbEndDateTime(toMs),
            duration: `${days} D`,
            barSizeSetting: meta.barSize,
            whatToShow: 'TRADES',
            useRth: 0,
            formatDate: 2
        });
        buffer.push(...normalizeBars(raw.bars || [], tf));
    } else {
        const totalSec = marketHourSeconds(fromMs, toMs);
        const max = meta.maxChunk;
        let cursorMs = toMs;
        while (cursorMs > fromMs) {
            const startMs = Math.max(fromMs, cursorMs - max * 1000);
            if (marketHourSeconds(startMs, cursorMs) > 0) {
                const durationSec = Math.ceil((cursorMs - startMs) / 1000);
                const bars = await fetchChunk({
                    contract,
                    endMs: cursorMs,
                    durationSec,
                    tf
                });
                buffer.push(...bars);
            }
            cursorMs = startMs;
        }
    }

    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.floor(toMs / 1000);
    const filtered = tf === '1d' ? buffer : buffer.filter(c => c[0] >= fromSec && c[0] < toSec);

    const ym = market.ymOfMs(toMs);
    const existingAbs = store.findExistingFile(symbol, tf, ym);
    const existing = existingAbs ? store.readCandles(existingAbs) : [];
    const { merged, added, replaced } = store.mergeCandles(existing, filtered);
    if (merged.length === 0) {
        return { path: existingAbs, fetched: buffer.length, kept: 0, added: 0, replaced: 0, total: 0 };
    }
    const newAbs = store.pathFor(symbol, tf, merged);
    if (existingAbs && existingAbs !== newAbs) fs.unlinkSync(existingAbs);
    store.writeCandlesAtomic(newAbs, merged);

    return {
        path: newAbs,
        fetched: buffer.length,
        kept: filtered.length,
        added,
        replaced,
        total: merged.length
    };
}

module.exports = { importRange };
