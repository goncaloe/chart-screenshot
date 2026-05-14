const { layout, escapeHtml } = require('../layout');

function daysPage({ ym, days }) {
    const body = !days.length
        ? `<div class="crumbs"><a href="/">Folders</a> / ${escapeHtml(ym)}</div>
           <h1>${escapeHtml(ym)}</h1>
           <p class="muted">No days in this folder.</p>`
        : `<div class="crumbs"><a href="/">Folders</a> / ${escapeHtml(ym)}</div>
           <h1>${escapeHtml(ym)}</h1>
           <table><thead><tr><th>Day</th></tr></thead><tbody>
           ${days.map(d => `<tr><td><a href="/folder/${encodeURIComponent(ym)}/${encodeURIComponent(d)}">${escapeHtml(d)}</a></td></tr>`).join('')}
           </tbody></table>`;
    return layout({ title: ym, body });
}

module.exports = { daysPage };
