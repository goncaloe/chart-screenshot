const { layout, escapeHtml, attr } = require('../layout');

function filePage(f) {
    const importHref = `/import?ym=${encodeURIComponent(f.ym)}&symbol=${encodeURIComponent(f.symbol)}&timeframe=${encodeURIComponent(f.timeframe)}`;
    const rangesRows = f.ranges.map((r, i) =>
        `<tr><td>${i + 1}</td>
         <td data-fmt-ts="${r.startTs}">${r.startTs}</td>
         <td data-fmt-ts="${r.endTs}">${r.endTs}</td>
         <td>${r.count}</td></tr>`).join('');

    const body = `
        <div class="crumbs">
            <a href="/">Folders</a> /
            <a href="/folder/${escapeHtml(f.ym)}">${escapeHtml(f.ym)}</a> /
            ${escapeHtml(f.name)}
        </div>
        <h1>${escapeHtml(f.symbol)} <span class="muted">${escapeHtml(f.timeframe)}</span></h1>
        <div class="actions">
            <a class="btn" href="/chart/${encodeURIComponent(f.ym)}/${encodeURIComponent(f.name)}">Open chart</a>
            <a class="btn" href="/lightweight/${encodeURIComponent(f.ym)}/${encodeURIComponent(f.name)}">Lightweight</a>
            <a class="btn secondary" href="${importHref}">Import more</a>
        </div>
        <p class="muted">
            ${f.count} candles
            ${f.firstTs ? `· <span data-fmt-ts="${f.firstTs}">${f.firstTs}</span> → <span data-fmt-ts="${f.lastTs}">${f.lastTs}</span>` : ''}
            · ${f.ranges.length} contiguous range(s)
        </p>
        <div class="svg-full" data-tf="${escapeHtml(f.timeframe)}" data-candles='${attr(f.candles)}'></div>
        <h2>Ranges</h2>
        <table>
            <thead><tr><th>#</th><th>Start (NY)</th><th>End (NY)</th><th>Candles</th></tr></thead>
            <tbody>${rangesRows}</tbody>
        </table>`;
    return layout({ title: `${f.symbol} ${f.timeframe}`, body });
}

module.exports = { filePage };
