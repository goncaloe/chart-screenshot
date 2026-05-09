import { api } from '../api.js';
import { escapeHtml } from '../app.js';

export async function render({ query }, root) {
    const symbol = query.symbol || '';
    const timeframe = query.timeframe || '5m';
    const from = query.from || '';
    const to = query.to || '';

    root.innerHTML = `
        <div class="crumbs"><a href="#/">Folders</a> / Import</div>
        <h1>Import historical data</h1>
        <form class="import" id="form">
            <label for="symbol">Symbol</label>
            <input id="symbol" name="symbol" required value="${escapeHtml(symbol)}" placeholder="AAPL" autocomplete="off">

            <label for="timeframe">Timeframe</label>
            <select id="timeframe" name="timeframe">
                ${['1m', '5m', '1d'].map(t => `<option value="${t}"${t === timeframe ? ' selected' : ''}>${t}</option>`).join('')}
            </select>

            <label for="from">From (NY local)</label>
            <input id="from" name="from" type="datetime-local" required value="${escapeHtml(from)}">

            <label for="to">To (NY local)</label>
            <input id="to" name="to" type="datetime-local" required value="${escapeHtml(to)}">

            <div class="full">
                <button class="btn" type="submit">Import</button>
                <span id="status" class="muted" style="margin-left:1rem;"></span>
            </div>
        </form>
        <div id="result"></div>`;

    const form = root.querySelector('#form');
    const status = root.querySelector('#status');
    const result = root.querySelector('#result');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        result.innerHTML = '';
        status.textContent = 'Importing... (TWS must be running)';
        const data = Object.fromEntries(new FormData(form).entries());
        data.from = (data.from || '').replace('T', ' ');
        data.to = (data.to || '').replace('T', ' ');
        try {
            const r = await api.import(data);
            status.textContent = '';
            result.innerHTML = `<div class="ok">
                Saved ${escapeHtml(r.path)}<br>
                fetched=${r.fetched} kept=${r.kept} added=${r.added} replaced=${r.replaced} total=${r.total}
            </div>`;
        } catch (err) {
            status.textContent = '';
            result.innerHTML = `<div class="error">${escapeHtml(err.message)}</div>`;
        }
    });
}
