import { api } from '../api.js';
import { escapeHtml } from '../app.js';

export async function render(_params, root) {
    const { folders } = await api.folders();
    if (!folders.length) {
        root.innerHTML = `<h1>Folders</h1><p class="muted">No data folders yet.</p>
            <a class="btn" href="#/import">Import historical data</a>`;
        return;
    }
    const rows = folders.map(f => `<tr><td><a href="#/folder/${escapeHtml(f)}">${escapeHtml(f)}</a></td></tr>`).join('');
    root.innerHTML = `
        <h1>Folders</h1>
        <table><thead><tr><th>Month</th></tr></thead><tbody>${rows}</tbody></table>`;
}
