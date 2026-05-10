const { layout, escapeHtml } = require('../layout');

function foldersPage({ folders }) {
    const body = !folders.length
        ? `<h1>Folders</h1><p class="muted">No data folders yet.</p>
           <a class="btn" href="/import">Import historical data</a>`
        : `<h1>Folders</h1>
           <table><thead><tr><th>Month</th></tr></thead><tbody>
           ${folders.map(f => `<tr><td><a href="/folder/${escapeHtml(f)}">${escapeHtml(f)}</a></td></tr>`).join('')}
           </tbody></table>`;
    return layout({ title: 'Folders', body });
}

module.exports = { foldersPage };
