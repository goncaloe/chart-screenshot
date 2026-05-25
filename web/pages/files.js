const { layout, escapeHtml, attr } = require('../layout');

function fmtChange(candles) {
    if (!Array.isArray(candles) || candles.length === 0) return '-';
    let minLow = Infinity, pct = 0;
    for (const c of candles) {
        if (c[3] < minLow) minLow = c[3];
        if (minLow > 0) {
            const rise = (c[2] - minLow) / minLow * 100;
            if (rise > pct) pct = rise;
        }
    }
    if (!Number.isFinite(pct)) return '-';
    // 0% -> cold (blue, hue 240), 500%+ -> warm (red, hue 0)
    const ratio = Math.min(Math.max(pct, 0), 500) / 500;
    const hue = 240 * (1 - ratio);
    return `<span style="color: hsl(${hue.toFixed(0)}, 75%, 50%)">${pct.toFixed(2)}%</span>`;
}

function riskBadge(level) {
    if (!level) return '';
    const colors = { low: '#2e7d32', medium: '#f9a825', high: '#ef6c00', critical: '#c62828' };
    const color = colors[level] || '#666';
    return `<span class="risk-badge" title="dilution risk" style="display:inline-block;margin-left:6px;padding:0 6px;border-radius:3px;font-size:11px;color:#fff;background:${color}">${escapeHtml(level)}</span>`;
}

function filesPage({ ym, dd, files, timeframe }) {
    const rows = files.map(f => {
        const link = `/file/${encodeURIComponent(ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}`;
        const chartHref = `/chart/${encodeURIComponent(ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}`;
        const lightweightHref = `/lightweight/${encodeURIComponent(ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}`;
        const showDilution = f.timeframe === '1m' || f.timeframe === '5m';
        const dilutionCell = showDilution
            ? `<input type="checkbox" disabled${f.hasInfo ? ' checked' : ''}><a href="#" class="fetch-stockinfo" data-ym="${escapeHtml(ym)}" data-day="${escapeHtml(dd)}" data-filename="${escapeHtml(f.name)}">↓</a>${riskBadge(f.riskLevel)}`
            : '';
        return `<tr>
            <td><a href="${link}">${escapeHtml(f.symbol)}</a></td>
            <td>${escapeHtml(f.timeframe)}</td>
            <td>${f.count}</td>
            <td data-fmt-ts="${f.firstTs ?? ''}">${f.firstTs ?? '-'}</td>
            <td data-fmt-ts="${f.lastTs ?? ''}">${f.lastTs ?? '-'}</td>
            <td>${fmtChange(f.candles)}</td>
            <td class="svg-cell" data-tf="${escapeHtml(f.timeframe)}" data-candles='${attr(f.candles)}'></td>
            <td style="text-align: center;"><input type="checkbox" disabled${f.hasPrint ? ' checked' : ''}></td>
            <td style="text-align: center;">${dilutionCell}</td>
            <td style="text-align: right;"><a href="${chartHref}">chart</a> | <a href="${lightweightHref}">lightweight</a></td>
        </tr>`;
    }).join('');

    const tfOptions = ['<option value="">All TFs</option>']
        .concat(['1m', '5m', '1d'].map(tf =>
            `<option value="${tf}"${tf === timeframe ? ' selected' : ''}>${tf}</option>`
        ))
        .join('');

    const body = `
        <div class="crumbs">
            <a href="/">Folders</a> /
            <a href="/folder/${encodeURIComponent(ym)}">${escapeHtml(ym)}</a> /
            ${escapeHtml(dd)}
        </div>
        <h1>${escapeHtml(ym)} / ${escapeHtml(dd)}</h1>
        <div class="actions">
            <form class="filter" method="get" action="/folder/${encodeURIComponent(ym)}/${encodeURIComponent(dd)}">
                <select name="timeframe">${tfOptions}</select>
                <button class="btn secondary" type="submit">Filtrar</button>
            </form>
            <a class="btn push-right" href="/import?ym=${encodeURIComponent(ym)}">Import</a>
        </div>
        ${files.length ? `<table>
            <thead><tr>
                <th>Symbol</th><th>TF</th><th>Count</th>
                <th>First (NY)</th><th>Last (NY)</th>
                <th>Change</th>
                <th style="text-align: center;">Candles</th>
                <th style="text-align: center;">Print</th>
                <th style="text-align: center;">Dilution</th>
                <th></th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>` : `<p class="muted">No files in this day.</p>`}`;
    return layout({ title: `${ym}/${dd}`, body });
}

module.exports = { filesPage };
