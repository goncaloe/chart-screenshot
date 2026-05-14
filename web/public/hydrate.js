import { renderCandlesSvg } from './svg.js';
import { formatNYLocal } from './market.js';

for (const row of document.querySelectorAll('.folder-tree .folder-row')) {
    const toggle = row.querySelector('.folder-toggle');
    if (!toggle) continue;
    toggle.addEventListener('click', async (e) => {
        e.preventDefault();
        const ym = row.dataset.ym;
        const caret = toggle.querySelector('.caret');
        const expanded = row.dataset.expanded === '1';
        if (expanded) {
            for (const r of row.parentElement.querySelectorAll(`tr.day-row[data-parent="${ym}"]`)) r.remove();
            row.dataset.expanded = '0';
            if (caret) caret.textContent = '▸';
            return;
        }
        let days = row._days;
        if (!days) {
            try {
                const r = await fetch(`/api/days/${encodeURIComponent(ym)}`);
                const body = await r.json();
                if (!r.ok) throw new Error(body.error || r.statusText);
                days = body.days;
                row._days = days;
            } catch (err) {
                const tr = document.createElement('tr');
                tr.className = 'day-row';
                tr.dataset.parent = ym;
                tr.innerHTML = `<td><span class="tree-indent">|</span> <span class="error">${err.message}</span></td>`;
                row.after(tr);
                row.dataset.expanded = '1';
                if (caret) caret.textContent = '▾';
                return;
            }
        }
        const rows = days.length
            ? days.map(d => `<tr class="day-row" data-parent="${ym}">
                <td><span class="tree-indent">|</span> <a href="/folder/${encodeURIComponent(ym)}/${encodeURIComponent(d)}">${d}</a></td>
            </tr>`).join('')
            : `<tr class="day-row" data-parent="${ym}"><td><span class="tree-indent">|</span> <span class="muted">no days</span></td></tr>`;
        row.insertAdjacentHTML('afterend', rows);
        row.dataset.expanded = '1';
        if (caret) caret.textContent = '▾';
    });
}

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
                body: JSON.stringify({ ym: btn.dataset.ym, dd: btn.dataset.dd, name: btn.dataset.name })
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body.error || r.statusText);
            location.href = `/file/${encodeURIComponent(body.ym)}/${encodeURIComponent(body.dd)}/${encodeURIComponent(body.name)}`;
        } catch (err) {
            alert('Erro ao converter: ' + err.message);
            btn.textContent = original;
            btn.disabled = false;
            delete btn.dataset.busy;
        }
    });
}

for (const slider of document.querySelectorAll('.range-slider')) {
    const inputs = slider.querySelectorAll('input[type=range]');
    const fromInput = inputs[0];
    const toInput = inputs[1];
    const fill = slider.querySelector('.range-fill');
    const invLeft = slider.querySelector('.inverse-left');
    const invRight = slider.querySelector('.inverse-right');
    const thumbs = slider.querySelectorAll('.thumb');
    const firstTs = +slider.dataset.firstts;
    const lastTs = +slider.dataset.lastts;
    const parent = slider.parentElement;
    const fromLabel = parent.querySelector('[data-role="from-label"]');
    const toLabel = parent.querySelector('[data-role="to-label"]');

    const tsFor = v => Math.round(firstTs + (lastTs - firstTs) * (v / 1000));

    function render() {
        const from = +fromInput.value;
        const to = +toInput.value;
        const fromPct = (from / 1000) * 100;
        const toPct = (to / 1000) * 100;
        invLeft.style.width = fromPct + '%';
        invRight.style.width = (100 - toPct) + '%';
        fill.style.left = fromPct + '%';
        fill.style.right = (100 - toPct) + '%';
        thumbs[0].style.left = fromPct + '%';
        thumbs[1].style.left = toPct + '%';
        const fromTs = tsFor(from);
        const toTs = tsFor(to);
        slider.dataset.fromTs = fromTs;
        slider.dataset.toTs = toTs;
        if (fromLabel) fromLabel.textContent = formatNYLocal(fromTs);
        if (toLabel) toLabel.textContent = formatNYLocal(toTs);
    }

    fromInput.addEventListener('input', () => {
        fromInput.value = Math.min(+fromInput.value, +toInput.value - 1);
        render();
    });
    toInput.addEventListener('input', () => {
        toInput.value = Math.max(+toInput.value, +fromInput.value + 1);
        render();
    });
    render();
}

for (const btn of document.querySelectorAll('button.range-delete')) {
    btn.addEventListener('click', async () => {
        if (btn.dataset.busy === '1') return;
        const slider = document.querySelector('.range-slider');
        if (!slider) return;
        const fromTs = +slider.dataset.fromTs;
        const toTs = +slider.dataset.toTs;
        if (!confirm(`Delete candles from ${formatNYLocal(fromTs)} to ${formatNYLocal(toTs)}?`)) return;
        btn.dataset.busy = '1';
        const original = btn.textContent;
        btn.textContent = 'Deleting…';
        btn.disabled = true;
        try {
            const r = await fetch('/api/delete-range', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ ym: btn.dataset.ym, dd: btn.dataset.dd, name: btn.dataset.name, fromTs, toTs })
            });
            const body = await r.json().catch(() => ({}));
            if (!r.ok) throw new Error(body.error || r.statusText);
            location.reload();
        } catch (err) {
            alert('Erro ao apagar: ' + err.message);
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
