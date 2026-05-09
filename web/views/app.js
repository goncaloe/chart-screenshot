import * as folders from './views/folders.js';
import * as files from './views/files.js';
import * as fileView from './views/file.js';
import * as importView from './views/import.js';
import * as chartView from './views/chart.js';

const routes = [
    { re: /^#?\/?$/, view: folders },
    { re: /^#\/folder\/([^/]+)$/, view: files, params: ['ym'] },
    { re: /^#\/file\/([^/]+)\/([^/?]+)$/, view: fileView, params: ['ym', 'name'] },
    { re: /^#\/chart\/([^/]+)\/([^/?]+)$/, view: chartView, params: ['ym', 'name'] },
    { re: /^#\/import(?:\?.*)?$/, view: importView }
];

function parseQuery(hash) {
    const i = hash.indexOf('?');
    const q = {};
    if (i < 0) return q;
    for (const part of hash.slice(i + 1).split('&')) {
        if (!part) continue;
        const [k, v = ''] = part.split('=');
        q[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
    return q;
}

async function route() {
    const app = document.getElementById('app');
    const hash = location.hash || '#/';
    const noQuery = hash.split('?')[0];
    for (const r of routes) {
        const m = noQuery.match(r.re);
        if (!m) continue;
        const params = {};
        (r.params || []).forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
        params.query = parseQuery(hash);
        app.textContent = 'Loading...';
        try {
            await r.view.render(params, app);
        } catch (e) {
            app.innerHTML = `<div class="error">${escapeHtml(e.message)}</div>`;
        }
        return;
    }
    app.innerHTML = '<div class="error">Not found</div>';
}

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
