const { layout, escapeHtml } = require('../layout');

function foldersPage({ folders }) {
    const body = !folders.length
        ? `<h1>Folders</h1><p class="muted">No data folders yet.</p>
           <a class="btn" href="/import">Import historical data</a>`
        : `<h1>Folders</h1>
           <table class="folder-tree"><thead><tr><th>Month</th></tr></thead><tbody>
           ${folders.map(f => `<tr class="folder-row" data-ym="${escapeHtml(f)}">
               <td><a href="#" class="folder-toggle"><span class="caret">▸</span> ${escapeHtml(f)}</a></td>
           </tr>`).join('')}
           </tbody></table>
           <span>Abrir no terminal:</span>
           <code>
               "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\ChromeDebugProfile"
           </code>`;
    return layout({ title: 'Folders', body });
}

module.exports = { foldersPage };
