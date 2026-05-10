import { renderCandlesSvg } from './svg.js';
import { formatNYLocal } from './market.js';

for (const cell of document.querySelectorAll('.svg-cell, .svg-full')) {
    const candles = JSON.parse(cell.dataset.candles || '[]');
    const tf = cell.dataset.tf;
    const isFull = cell.classList.contains('svg-full');
    const w = isFull ? (cell.clientWidth || 1200) : 240;
    const h = isFull ? 140 : 36;
    cell.appendChild(renderCandlesSvg(candles, tf, { width: w, height: h }));
}

for (const el of document.querySelectorAll('[data-fmt-ts]')) {
    const ts = +el.dataset.fmtTs;
    if (Number.isFinite(ts) && ts > 0) el.textContent = formatNYLocal(ts);
}
