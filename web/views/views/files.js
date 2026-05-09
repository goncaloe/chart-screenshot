import { api } from '../api.js';
import { escapeHtml } from '../app.js';
import { renderCandlesSvg } from '../svg.js';
import { formatNYLocal } from '../market.js';

function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export async function render({ ym }, root) {
    const { files } = await api.files(ym);
    root.innerHTML = `
        <div class="crumbs"><a href="#/">Folders</a> / ${escapeHtml(ym)}</div>
        <h1>${escapeHtml(ym)}</h1>
        <div class="actions">
            <a class="btn" href="#/import?ym=${encodeURIComponent(ym)}">Import</a>
        </div>
        ${files.length ? `<table>
            <thead><tr>
                <th>Symbol</th><th>TF</th><th>Count</th><th>First (NY)</th><th>Last (NY)</th><th>Size</th><th>Activity</th>
            </tr></thead>
            <tbody></tbody>
        </table>` : `<p class="muted">No files in this folder.</p>`}`;
    const tbody = root.querySelector('tbody');
    if (!tbody) return;
    for (const f of files) {
        const tr = document.createElement('tr');
        const link = `#/file/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        tr.innerHTML = `
            <td><a href="${link}">${escapeHtml(f.symbol)}</a></td>
            <td>${escapeHtml(f.timeframe)}</td>
            <td>${f.count}</td>
            <td>${f.firstTs ? formatNYLocal(f.firstTs) : '-'}</td>
            <td>${f.lastTs ? formatNYLocal(f.lastTs) : '-'}</td>
            <td>${fmtSize(f.size)}</td>
            <td class="svg-cell"></td>`;
        const cell = tr.querySelector('.svg-cell');
        cell.appendChild(renderCandlesSvg(f.candles, f.timeframe, { width: 240, height: 36 }));
        tbody.appendChild(tr);
    }
}
