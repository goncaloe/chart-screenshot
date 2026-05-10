const { layout, escapeHtml, attr } = require('../layout');

function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function filesPage({ ym, files, day }) {
    const rows = files.map(f => {
        const link = `/file/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        const chartHref = `/chart/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        const lightweightHref = `/lightweight/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        return `<tr>
            <td><a href="${link}">${escapeHtml(f.symbol)}</a></td>
            <td>${escapeHtml(f.timeframe)}</td>
            <td>${f.count}</td>
            <td data-fmt-ts="${f.firstTs ?? ''}">${f.firstTs ?? '-'}</td>
            <td data-fmt-ts="${f.lastTs ?? ''}">${f.lastTs ?? '-'}</td>
            <td>${fmtSize(f.size)}</td>
            <td class="svg-cell" data-tf="${escapeHtml(f.timeframe)}" data-candles='${attr(f.candles)}'></td>
            <td style="text-align: right;"><a href="${chartHref}">chart</a> | <a href="${lightweightHref}">lightweight</a></td>
        </tr>`;
    }).join('');

    const dayOptions = ['<option value="">All days</option>']
        .concat(Array.from({ length: 31 }, (_, i) => {
            const d = i + 1;
            return `<option value="${d}"${d === day ? ' selected' : ''}>${d}</option>`;
        }))
        .join('');

    const body = `
        <div class="crumbs"><a href="/">Folders</a> / ${escapeHtml(ym)}</div>
        <h1>${escapeHtml(ym)}</h1>
        <div class="actions">
            <form class="filter" method="get" action="/folder/${encodeURIComponent(ym)}">
                <select name="day">${dayOptions}</select>
                <button class="btn secondary" type="submit">Filtrar</button>
            </form>
            <a class="btn push-right" href="/import?ym=${encodeURIComponent(ym)}">Import</a>
        </div>
        ${files.length ? `<table>
            <thead><tr>
                <th>Symbol</th><th>TF</th><th>Count</th>
                <th>First (NY)</th><th>Last (NY)</th>
                <th>Size</th><th>Candles</th><th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>` : `<p class="muted">No files in this folder.</p>`}`;
    return layout({ title: ym, body });
}

module.exports = { filesPage };
