const { escapeHtml } = require('../layout');

function riskBadge(level, { marginLeft = false } = {}) {
    if (!level) return '';
    const colors = { low: '#2e7d32', medium: '#f9a825', high: '#ef6c00', critical: '#c62828' };
    const color = colors[level] || '#666';
    const margin = marginLeft ? 'margin-left:6px;' : '';
    return `<span class="risk-badge" title="dilution risk" style="display:inline-block;${margin}padding:0 6px;border-radius:3px;font-size:11px;color:#fff;background:${color}">${escapeHtml(level)}</span>`;
}

function changePct(candles) {
    if (!Array.isArray(candles) || candles.length === 0) return null;
    let minLow = Infinity, pct = 0;
    for (const c of candles) {
        if (c[3] < minLow) minLow = c[3];
        if (minLow > 0) {
            const rise = (c[2] - minLow) / minLow * 100;
            if (rise > pct) pct = rise;
        }
    }
    return Number.isFinite(pct) ? pct : null;
}

function fmtChange(candles) {
    const pct = changePct(candles);
    if (pct === null) return '-';
    // 0% -> cold (blue, hue 240), 500%+ -> warm (red, hue 0)
    const ratio = Math.min(Math.max(pct, 0), 500) / 500;
    const hue = 240 * (1 - ratio);
    return `<span style="color: hsl(${hue.toFixed(0)}, 75%, 50%)">${pct.toFixed(2)}%</span>`;
}

module.exports = { riskBadge, fmtChange };
