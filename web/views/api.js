async function get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
}

async function post(url, body) {
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || r.statusText);
    return data;
}

export const api = {
    folders: () => get('/api/folders'),
    files: (ym) => get(`/api/folders/${encodeURIComponent(ym)}`),
    file: (ym, name) => get(`/api/file/${encodeURIComponent(ym)}/${encodeURIComponent(name)}`),
    import: (body) => post('/api/import', body)
};
