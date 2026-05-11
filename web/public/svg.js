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

export function renderCandlesSvg(candles, tf, { height = 30 } = {}) {
    const ns = 'http://www.w3.org/2000/svg';
    const width = 100;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', height);
    svg.style.display = 'block';
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
        rect.setAttribute('fill', present ? '#5e8cee' : '#cbd5e1');
        const title = document.createElementNS(ns, 'title');
        title.textContent = `${present ? 'data' : 'gap'}: ${formatNYLocal(slots[i].ts)} → ${formatNYLocal(slots[j - 1].ts)} (${j - i})`;
        rect.appendChild(title);
        svg.appendChild(rect);
        i = j;
    }

    const closeBy = new Map(candles.map(c => [c[0], c[4]]));
    let pMin = Infinity, pMax = -Infinity;
    for (const c of candles) {
        if (c[4] < pMin) pMin = c[4];
        if (c[4] > pMax) pMax = c[4];
    }
    const pRange = (pMax - pMin) || 1;
    const pad = 2;
    const yFor = p => height - pad - ((p - pMin) / pRange) * (height - 2 * pad);

    let d = '';
    let pen = false;
    for (let k = 0; k < n; k++) {
        if (!slots[k].present) { pen = false; continue; }
        const price = closeBy.get(slots[k].ts);
        if (price == null) { pen = false; continue; }
        const x = (k + 0.5) * slotW;
        const y = yFor(price);
        d += (pen ? 'L' : 'M') + x.toFixed(3) + ',' + y.toFixed(3) + ' ';
        pen = true;
    }
    if (d) {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d.trim());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', '#1e3a8a');
        path.setAttribute('stroke-width', '1');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(path);
    }

    return svg;
}
