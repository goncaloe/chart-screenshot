const NY_TZ = 'America/New_York';
const HOLIDAYS_2026 = new Set([
    '2026-01-01','2026-01-19','2026-02-16','2026-04-03','2026-05-25',
    '2026-06-19','2026-07-03','2026-09-07','2026-11-26','2026-12-25'
]);

const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: NY_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
});

export function nyParts(date) {
    const out = {};
    for (const p of fmt.formatToParts(date)) {
        if (p.type !== 'literal') out[p.type] = p.value;
    }
    return out;
}

export function formatNYLocal(unixSec) {
    const p = nyParts(new Date(unixSec * 1000));
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

export function isMarketOpen(unixSec) {
    const p = nyParts(new Date(unixSec * 1000));
    const wd = new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay();
    if (wd === 0 || wd === 6) return false;
    if (HOLIDAYS_2026.has(`${p.year}-${p.month}-${p.day}`)) return false;
    const minutes = +p.hour * 60 + +p.minute;
    return minutes >= 4 * 60 && minutes < 20 * 60;
}

export const TF = {
    '1m': 60, '5m': 300, '1d': 86400
};

export function timeframeSeconds(tf) {
    if (!TF[tf]) throw new Error('Bad tf: ' + tf);
    return TF[tf];
}
