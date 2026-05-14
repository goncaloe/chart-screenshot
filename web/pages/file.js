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
            <a href="/folder/${escapeHtml(f.ym)}/${escapeHtml(f.dd)}">${escapeHtml(f.dd)}</a> /
            ${escapeHtml(f.name)}
        </div>
        <h1>${escapeHtml(f.symbol)} <span class="muted">${escapeHtml(f.timeframe)}</span></h1>
        <div class="actions">
            <a class="btn" href="/chart/${encodeURIComponent(f.ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}">Open chart</a>
            <a class="btn" href="/lightweight/${encodeURIComponent(f.ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}">Lightweight</a>
            <a class="btn secondary" href="${importHref}">Import more</a>
            ${f.timeframe === '1m' ? `<button class="btn secondary convert-to-5m" type="button" data-ym="${escapeHtml(f.ym)}" data-dd="${escapeHtml(f.dd)}" data-name="${escapeHtml(f.name)}">Convert to 5m</button>` : ''}
        </div>
        <p class="muted">
            ${f.count} candles
            ${f.firstTs ? `· <span data-fmt-ts="${f.firstTs}">${f.firstTs}</span> → <span data-fmt-ts="${f.lastTs}">${f.lastTs}</span>` : ''}
            · ${f.ranges.length} contiguous range(s)
        </p>
        <div class="svg-full" data-tf="${escapeHtml(f.timeframe)}" data-candles='${attr(f.candles)}'></div>
        ${f.firstTs && f.lastTs ? `
        <div class="range-slider" data-firstts="${f.firstTs}" data-lastts="${f.lastTs}">
            <div class="track">
                <div class="inverse-left" style="width:0%"></div>
                <div class="inverse-right" style="width:0%"></div>
                <div class="range-fill" style="left:0%;right:0%;"></div>
                <span class="thumb" style="left:0%"></span>
                <span class="thumb" style="left:100%"></span>
            </div>
            <input type="range" min="0" max="1000" value="0" data-role="from">
            <input type="range" min="0" max="1000" value="1000" data-role="to">
        </div>
        <div class="range-info muted">
            <span data-role="from-label"></span> → <span data-role="to-label"></span>
        </div>
        <button class="btn range-delete" type="button" data-ym="${escapeHtml(f.ym)}" data-dd="${escapeHtml(f.dd)}" data-name="${escapeHtml(f.name)}">Delete Selection</button>
        ` : ''}
        <h2>Ranges</h2>
        <table>
            <thead><tr><th>#</th><th>Start (NY)</th><th>End (NY)</th><th>Candles</th></tr></thead>
            <tbody>${rangesRows}</tbody>
        </table>`;
    return layout({ title: `${f.symbol} ${f.timeframe}`, body });
}

module.exports = { filePage };
