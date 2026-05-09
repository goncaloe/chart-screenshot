import { api } from '../api.js';
import { escapeHtml } from '../app.js';
import { renderCandlesSvg } from '../svg.js';
import { formatNYLocal } from '../market.js';

export async function render({ ym, name }, root) {
    const f = await api.file(ym, name);
    const importHref = `#/import?ym=${encodeURIComponent(ym)}&symbol=${encodeURIComponent(f.symbol)}&timeframe=${encodeURIComponent(f.timeframe)}`;
    root.innerHTML = `
        <div class="crumbs"><a href="#/">Folders</a> / <a href="#/folder/${escapeHtml(ym)}">${escapeHtml(ym)}</a> / ${escapeHtml(name)}</div>
        <h1>${escapeHtml(f.symbol)} <span class="muted">${escapeHtml(f.timeframe)}</span></h1>
        <div class="actions">
            <a class="btn" href="#/chart/${encodeURIComponent(ym)}/${encodeURIComponent(name)}">Open chart</a>
            <a class="btn secondary" href="${importHref}">Import more</a>
        </div>
        <p class="muted">
            ${f.count} candles
            ${f.firstTs ? ` · ${formatNYLocal(f.firstTs)} → ${formatNYLocal(f.lastTs)}` : ''}
            · ${f.ranges.length} contiguous range(s)
        </p>
        <div id="svgWrap"></div>
        <h2>Ranges</h2>
        <table>
            <thead><tr><th>#</th><th>Start (NY)</th><th>End (NY)</th><th>Candles</th></tr></thead>
            <tbody>${f.ranges.map((r, i) =>
                `<tr><td>${i + 1}</td><td>${formatNYLocal(r.startTs)}</td><td>${formatNYLocal(r.endTs)}</td><td>${r.count}</td></tr>`
            ).join('')}</tbody>
        </table>`;
    const wrap = root.querySelector('#svgWrap');
    const w = wrap.clientWidth || 1200;
    const svg = renderCandlesSvg(f.candles, f.timeframe, { width: w, height: 140 });
    svg.classList.add('svg-full');
    wrap.appendChild(svg);
}
