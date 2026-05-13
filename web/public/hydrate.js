import { renderCandlesSvg } from './svg.js';
import { formatNYLocal } from './market.js';

for (const cell of document.querySelectorAll('.svg-cell, .svg-full')) {
    const candles = JSON.parse(cell.dataset.candles || '[]');
    const tf = cell.dataset.tf;
    const isFull = cell.classList.contains('svg-full');
    const w = isFull ? (cell.clientWidth || 1200) : 240;
    const h = isFull ? 140 : 36;
    cell.appendChild(renderCandlesSvg(candles, tf, { width: w, height: h }));
}

for (const el of document.querySelectorAll('[data-fmt-ts]')) {
    const ts = +el.dataset.fmtTs;
    if (Number.isFinite(ts) && ts > 0) el.textContent = formatNYLocal(ts);
}

for (const btn of document.querySelectorAll('button.convert-to-5m')) {
    btn.addEventListener('click', async () => {
        if (btn.dataset.busy === '1') return;
        btn.dataset.busy = '1';
        const original = btn.textContent;
        btn.textContent = 'Converting…';
        btn.disabled = true;
        try {
            const r = await fetch('/api/convert-to-5m', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ym: btn.dataset.ym, name: btn.dataset.name })
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body.error || r.statusText);
            location.href = `/file/${encodeURIComponent(body.ym)}/${encodeURIComponent(body.name)}`;
        } catch (err) {
            alert('Erro ao converter: ' + err.message);
            btn.textContent = original;
            btn.disabled = false;
            delete btn.dataset.busy;
        }
    });
}

for (const link of document.querySelectorAll('a.fetch-meta')) {
    link.addEventListener('click', async (e) => {
        e.preventDefault();
        if (link.dataset.busy === '1') return;
        link.dataset.busy = '1';
        const original = link.textContent;
        link.textContent = '…';
        try {
            const r = await fetch('/api/stockinfo', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    ym: link.dataset.ym,
                    day: Number(link.dataset.day),
                    filename: link.dataset.filename
                })
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body.error || r.statusText);
            const cb = link.parentElement.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = true;
        } catch (err) {
            alert('Erro ao buscar meta: ' + err.message);
        } finally {
            link.textContent = original;
            delete link.dataset.busy;
        }
    });
}
