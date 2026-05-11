const { layout, escapeHtml, attr } = require('../layout');

function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
}

function filesPage({ ym, files, day, timeframe }) {
    const showStockinfos = !!day;
    const rows = files.map(f => {
        const link = `/file/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        const chartHref = `/chart/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        const lightweightHref = `/lightweight/${encodeURIComponent(ym)}/${encodeURIComponent(f.name)}`;
        const rangeCell = showStockinfos
            ? `<td style="text-align: center;"><input type="checkbox" disabled${f.hasRange ? ' checked' : ''}></td>`
            : '';
        const metaCell = showStockinfos
            ? `<td style="text-align: center;"><input type="checkbox" disabled${f.hasMeta ? ' checked' : ''}><a href="#" class="fetch-meta" data-ym="${escapeHtml(ym)}" data-day="${day}" data-filename="${escapeHtml(f.name)}">↓</a></td>`
            : '';
        return `<tr>
            <td><a href="${link}">${escapeHtml(f.symbol)}</a></td>
            <td>${escapeHtml(f.timeframe)}</td>
            <td>${f.count}</td>
            <td data-fmt-ts="${f.firstTs ?? ''}">${f.firstTs ?? '-'}</td>
            <td data-fmt-ts="${f.lastTs ?? ''}">${f.lastTs ?? '-'}</td>
            <td>${fmtSize(f.size)}</td>
            <td class="svg-cell" data-tf="${escapeHtml(f.timeframe)}" data-candles='${attr(f.candles)}'></td>
            ${rangeCell}
            ${metaCell}
            <td style="text-align: right;"><a href="${chartHref}">chart</a> | <a href="${lightweightHref}">lightweight</a></td>
        </tr>`;
    }).join('');

    const dayOptions = ['<option value="">All days</option>']
        .concat(Array.from({ length: 31 }, (_, i) => {
            const d = i + 1;
            return `<option value="${d}"${d === day ? ' selected' : ''}>${d}</option>`;
        }))
        .join('');

    const tfOptions = ['<option value="">All TFs</option>']
        .concat(['1m', '5m', '1d'].map(tf =>
            `<option value="${tf}"${tf === timeframe ? ' selected' : ''}>${tf}</option>`
        ))
        .join('');

    const body = `
        <div class="crumbs"><a href="/">Folders</a> / ${escapeHtml(ym)}</div>
        <h1>${escapeHtml(ym)}</h1>
        <div class="actions">
            <form class="filter" method="get" action="/folder/${encodeURIComponent(ym)}">
                <select name="day">${dayOptions}</select>
                <select name="timeframe">${tfOptions}</select>
                <button class="btn secondary" type="submit">Filtrar</button>
            </form>
            <a class="btn push-right" href="/import?ym=${encodeURIComponent(ym)}">Import</a>
        </div>
        ${files.length ? `<table>
            <thead><tr>
                <th>Symbol</th><th>TF</th><th>Count</th>
                <th>First (NY)</th><th>Last (NY)</th>
                <th>Size</th>
                <th style="text-align: center;">Candles</th>
                ${showStockinfos ? '<th style="text-align: center;">Range</th>' : ''}
                ${showStockinfos ? '<th style="text-align: center;">Meta</th>' : ''}
                <th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>` : `<p class="muted">No files in this folder.</p>`}`;
    return layout({ title: ym, body });
}

module.exports = { filesPage };
