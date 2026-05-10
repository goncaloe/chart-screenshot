function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const form = document.getElementById('form');
const status = document.getElementById('status');
const result = document.getElementById('result');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    result.innerHTML = '';
    status.textContent = 'Importing... (TWS must be running)';
    const data = Object.fromEntries(new FormData(form).entries());
    data.from = (data.from || '').replace('T', ' ');
    data.to = (data.to || '').replace('T', ' ');
    try {
        const r = await fetch('/api/import', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(data)
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || r.statusText);
        status.textContent = '';
        result.innerHTML = `<div class="ok">
            Saved ${escapeHtml(body.path)}<br>
            fetched=${body.fetched} kept=${body.kept} added=${body.added} replaced=${body.replaced} total=${body.total}
        </div>`;
    } catch (err) {
        status.textContent = '';
        result.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
    }
});
