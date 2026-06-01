const { layout, escapeHtml, attr } = require('../layout');
const { riskBadge, fmtChange } = require('./components');

function stockInfoSection(s) {
    if (!s) return '';
    const stats = [];
    if (s.shs_float != null) stats.push(['Float & OS', `${escapeHtml(s.shs_float)}M`]);
    if (s.inst_own != null) stats.push(['Inst Own', `${escapeHtml(s.inst_own)}%`]);
    if (s.cps != null) stats.push(['Net Cash/Sh', escapeHtml(s.cps)]);
    if (s.cash != null) stats.push(['Cash', s.cash === 'positive' ? 'cashflow positive' : `${escapeHtml(s.cash)} months`]);
    if (s.country != null) stats.push(['Country', escapeHtml(String(s.country).trim())]);

    const statsHtml = stats.length
        ? `<dl class="stockinfo-stats">${stats.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`
        : '';

    const r = s.dilution_risk;
    const riskHtml = r && r.level
        ? `<p>Dilution risk: ${riskBadge(r.level)} ${r.score != null ? `<span class="muted">(score ${escapeHtml(r.score)})</span>` : ''}</p>
           ${Array.isArray(r.factors) && r.factors.length ? `<ul class="stockinfo-factors">${r.factors.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}`
        : '';

    const newsHtml = Array.isArray(s.news) && s.news.length
        ? `<h3>News</h3>
           <ul class="stockinfo-news">${s.news.map(n => `<li><span class="muted">${escapeHtml(n.date)}</span> — ${escapeHtml(n.title)}</li>`).join('')}</ul>`
        : '';

    if (!statsHtml && !riskHtml && !newsHtml) return '';
    return `
        <h2>Stock Info</h2>
        ${statsHtml}
        ${riskHtml}
        ${newsHtml}`;
}

function filePage(f) {
    const importHref = `/import?ym=${encodeURIComponent(f.ym)}&symbol=${encodeURIComponent(f.symbol)}&timeframe=${encodeURIComponent(f.timeframe)}`;

    const body = `
        <div class="crumbs">
            <a href="/">Folders</a> /
            <a href="/#${encodeURIComponent(f.ym)}">${escapeHtml(f.ym)}</a> /
            <a href="/folder/${escapeHtml(f.ym)}/${escapeHtml(f.dd)}">${escapeHtml(f.dd)}</a> /
            ${escapeHtml(f.name)}
        </div>
        <h1>${escapeHtml(f.symbol)} <span class="muted">${escapeHtml(f.timeframe)}</span></h1>
        <div class="actions">
            <a class="btn" href="/lightweight/${encodeURIComponent(f.ym)}/${encodeURIComponent(f.dd)}/${encodeURIComponent(f.name)}">Lightweight</a>
            <a class="btn secondary" href="${importHref}">Import more</a>
            ${f.timeframe === '1m' ? `<button class="btn secondary convert-to-5m" type="button" data-ym="${escapeHtml(f.ym)}" data-dd="${escapeHtml(f.dd)}" data-name="${escapeHtml(f.name)}">Convert to 5m</button>` : ''}
            <button class="btn delete-chart" type="button" data-ym="${escapeHtml(f.ym)}" data-dd="${escapeHtml(f.dd)}" data-name="${escapeHtml(f.name)}">Delete Chart</button>
        </div>
        <p class="muted">
            ${f.count} candles
            ${f.firstTs ? `· <span data-fmt-ts="${f.firstTs}">${f.firstTs}</span> → <span data-fmt-ts="${f.lastTs}">${f.lastTs}</span>` : ''}
            · Change: ${fmtChange(f.candles)}
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
        <div class="range-info muted" style="display: inline-block;">
            <span data-role="from-label"></span> → <span data-role="to-label"></span>
        </div>
        <button class="btn range-delete" type="button" data-ym="${escapeHtml(f.ym)}" data-dd="${escapeHtml(f.dd)}" data-name="${escapeHtml(f.name)}">Delete Selection</button>
        ` : ''}
        ${stockInfoSection(f.stockinfo)}`;
    return layout({ title: `${f.symbol} ${f.timeframe}`, body });
}

module.exports = { filePage };
