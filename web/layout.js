function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function attr(obj) {
    return JSON.stringify(obj).replace(/&/g, '&amp;').replace(/'/g, '&#39;');
}

function layout({ title, body, scripts = [], hydrate = true }) {
    return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<header>
  <a href="/" class="brand">chart-screenshot</a>
  <nav>
    <a href="/">Folders</a>
    <a href="/import">Import</a>
  </nav>
</header>
<main>${body}</main>
${hydrate ? `<script type="module" src="/assets/hydrate.js"></script>` : ''}
${scripts.map(s => typeof s === 'string'
    ? `<script src="${escapeHtml(s)}"></script>`
    : `<script type="${s.type || 'module'}" src="${escapeHtml(s.src)}"></script>`).join('\n')}
</body></html>`;
}

module.exports = { layout, escapeHtml, attr };
