const ib = require('./ib');
const market = require('./market');
const store = require('./store');

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
        const days = Math.max(1, Math.ceil((toMs - fromMs) / 86400000));
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
        const totalSec = Math.ceil((toMs - fromMs) / 1000);
        const max = meta.maxChunk;
        let remaining = totalSec;
        let cursorMs = toMs;
        while (remaining > 0) {
            const chunk = Math.min(remaining, max);
            const bars = await fetchChunk({
                contract,
                endMs: cursorMs,
                durationSec: chunk,
                tf
            });
            buffer.push(...bars);
            cursorMs -= chunk * 1000;
            remaining -= chunk;
        }
    }

    const fromSec = Math.floor(fromMs / 1000);
    const toSec = Math.floor(toMs / 1000);
    const filtered = buffer.filter(c => c[0] >= fromSec && c[0] < toSec);

    const abs = store.pathFor(symbol, tf, toMs);
    const existing = store.readCandles(abs);
    const { merged, added, replaced } = store.mergeCandles(existing, filtered);
    store.writeCandlesAtomic(abs, merged);

    return {
        path: abs,
        fetched: buffer.length,
        kept: filtered.length,
        added,
        replaced,
        total: merged.length
    };
}

module.exports = { importRange };
