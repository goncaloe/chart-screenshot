import { isMarketOpen, timeframeSeconds, formatNYLocal } from './market.js';

function buildSlots(candles, tf) {
    if (!candles.length) return [];
    const step = timeframeSeconds(tf);
    const have = new Set(candles.map(c => c[0]));
    const first = candles[0][0];
    const last = candles[candles.length - 1][0];
    const slots = [];
    if (tf === '1d') {
        // Daily timestamps sit at NY-midnight, whose UTC offset changes across
        // DST. Walk calendar days and match by date so a DST boundary inside
        // the range doesn't make every later day read as a gap.
        const dayKey = ts => {
            const d = new Date(ts * 1000);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        };
        const tsByDay = new Map(candles.map(c => [dayKey(c[0]), c[0]]));
        const sd = new Date(first * 1000);
        const ed = new Date(last * 1000);
        let cur = Date.UTC(sd.getUTCFullYear(), sd.getUTCMonth(), sd.getUTCDate());
        const stop = Date.UTC(ed.getUTCFullYear(), ed.getUTCMonth(), ed.getUTCDate());
        for (; cur <= stop; cur += 86400000) {
            const d = new Date(cur);
            const wd = d.getUTCDay();
            if (wd === 0 || wd === 6) continue;
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
            const ts = tsByDay.get(key);
            slots.push({ ts: ts != null ? ts : Math.floor(cur / 1000), present: ts != null });
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

    if (tf !== '1d' && n > 1) {
        let prevDay = formatNYLocal(slots[0].ts).slice(0, 10);
        for (let k = 1; k < n; k++) {
            const currDay = formatNYLocal(slots[k].ts).slice(0, 10);
            if (currDay !== prevDay) {
                const x = k * slotW;
                const line = document.createElementNS(ns, 'line');
                line.setAttribute('x1', x);
                line.setAttribute('x2', x);
                line.setAttribute('y1', 0);
                line.setAttribute('y2', height);
                line.setAttribute('stroke', '#bfdbfe');
                line.setAttribute('stroke-width', '0.5');
                line.setAttribute('vector-effect', 'non-scaling-stroke');
                svg.appendChild(line);
            }
            prevDay = currDay;
        }
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
