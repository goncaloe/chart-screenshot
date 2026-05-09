import { isMarketOpen, timeframeSeconds, formatNYLocal } from './market.js';

function buildSlots(candles, tf) {
    if (!candles.length) return [];
    const step = timeframeSeconds(tf);
    const have = new Set(candles.map(c => c[0]));
    const first = candles[0][0];
    const last = candles[candles.length - 1][0];
    const slots = [];
    if (tf === '1d') {
        for (let t = first; t <= last; t += step) {
            const d = new Date(t * 1000);
            const wd = d.getUTCDay();
            if (wd === 0 || wd === 6) continue;
            slots.push({ ts: t, present: have.has(t) });
        }
    } else {
        for (let t = first; t <= last; t += step) {
            if (!isMarketOpen(t)) continue;
            slots.push({ ts: t, present: have.has(t) });
        }
    }
    return slots;
}

export function renderCandlesSvg(candles, tf, { width = 240, height = 36 } = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.style.background = '#f3f4f6';

    if (!candles.length) {
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', width / 2); t.setAttribute('y', height / 2 + 4);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '10');
        t.setAttribute('fill', '#9ca3af');
        t.textContent = 'empty';
        svg.appendChild(t);
        return svg;
    }

    const slots = buildSlots(candles, tf);
    const n = slots.length;
    if (!n) return svg;

    const slotW = width / n;
    let i = 0;
    while (i < n) {
        const present = slots[i].present;
        let j = i;
        while (j < n && slots[j].present === present) j++;
        const x = i * slotW;
        const w = (j - i) * slotW;
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', w);
        rect.setAttribute('height', height);
        rect.setAttribute('fill', present ? '#2563eb' : '#cbd5e1');
        const title = document.createElementNS(ns, 'title');
        title.textContent = `${present ? 'data' : 'gap'}: ${formatNYLocal(slots[i].ts)} → ${formatNYLocal(slots[j - 1].ts)} (${j - i})`;
        rect.appendChild(title);
        svg.appendChild(rect);
        i = j;
    }
    return svg;
}
