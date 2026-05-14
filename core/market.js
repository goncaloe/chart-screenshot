const HOLIDAYS = new Set([
    '01-01', '01-19', '02-16', '04-03', '05-25',
    '06-19', '07-03', '09-07', '11-26', '12-25'
]);

const NY_TZ = 'America/New_York';

const nyParts = (() => {
    const f = new Intl.DateTimeFormat('en-US', {
        timeZone: NY_TZ, hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    return (date) => {
        const out = {};
        for (const p of f.formatToParts(date)) {
            if (p.type !== 'literal') out[p.type] = p.value;
        }
        return out;
    };
})();

function nyOffsetMinutes(utcMs) {
    const p = nyParts(new Date(utcMs));
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUTC - utcMs) / 60000);
}

function parseNYLocal(str) {
    const m = String(str).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (!m) throw new Error(`Invalid NY datetime: "${str}". Use "YYYY-MM-DD HH:MM"`);
    const [, y, mo, d, h, mi, s] = m;
    let guess = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0));
    let off = nyOffsetMinutes(guess);
    let utc = guess - off * 60000;
    const off2 = nyOffsetMinutes(utc);
    if (off2 !== off) utc = guess - off2 * 60000;
    return new Date(utc);
}

function formatNYLocal(ms) {
    const p = nyParts(new Date(ms));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function nyDateKey(unixSec) {
    const p = nyParts(new Date(unixSec * 1000));
    return `${p.year}-${p.month}-${p.day}`;
}

function isHoliday(unixSec) {
    const p = nyParts(new Date(unixSec * 1000));
    return HOLIDAYS.has(`${p.month}-${p.day}`);
}

function isMarketOpen(unixSec, checkHours = true) {
    const d = new Date(unixSec * 1000);
    const p = nyParts(d);
    const wd = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay();
    if (wd === 0 || wd === 6) return false;
    if (HOLIDAYS.has(`${p.month}-${p.day}`)) return false;
    if (!checkHours) return true;
    const minutes = +p.hour * 60 + +p.minute;
    return minutes >= 4 * 60 && minutes < 20 * 60;
}

const TF = {
    '1m': { sec: 60, barSize: '1 min', durUnit: 'S', maxChunk: 86400 },
    '5m': { sec: 300, barSize: '5 mins', durUnit: 'S', maxChunk: 86400 },
    '1d': { sec: 86400, barSize: '1 day', durUnit: 'D', maxChunk: 365 }
};

function tfMeta(tf) {
    if (!TF[tf]) throw new Error(`Unsupported timeframe: ${tf}`);
    return TF[tf];
}

function timeframeSeconds(tf) { return tfMeta(tf).sec; }
function tfBarSizeSetting(tf) { return tfMeta(tf).barSize; }

function expectedBarTimestamps(fromSec, toSec, tf) {
    const step = timeframeSeconds(tf);
    const out = [];
    if (tf === '1d') {
        let cur = Math.floor(fromSec / step) * step;
        while (cur < toSec) {
            const key = nyDateKey(cur);
            const wd = new Date(`${key}T12:00:00Z`).getUTCDay();
            if (wd !== 0 && wd !== 6 && !isHoliday(cur)) out.push(cur);
            cur += step;
        }
        return out;
    }
    let cur = Math.floor(fromSec / step) * step;
    while (cur < toSec) {
        if (isMarketOpen(cur, true)) out.push(cur);
        cur += step;
    }
    return out;
}

function formatIbEndDateTime(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`;
}

function ymOfMs(ms) {
    const p = nyParts(new Date(ms));
    return `${p.year}-${p.month}`;
}

function ddOfMs(ms) {
    const p = nyParts(new Date(ms));
    return p.day;
}

function utcNyOffset() {
    const date = new Date();
    const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
    const ny  = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
    return (ny - utc);
}


module.exports = {
    NY_TZ,
    HOLIDAYS,
    isHoliday,
    parseNYLocal,
    formatNYLocal,
    isMarketOpen,
    expectedBarTimestamps,
    timeframeSeconds,
    tfBarSizeSetting,
    tfMeta,
    formatIbEndDateTime,
    ymOfMs,
    ddOfMs,
    nyDateKey,
    utcNyOffset
};
