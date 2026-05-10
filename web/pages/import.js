const { layout, escapeHtml } = require('../layout');

function importPage(query = {}) {
    const symbol = query.symbol || '';
    const timeframe = query.timeframe || '5m';
    const from = query.from || '';
    const to = query.to || '';
    const tfOpts = ['1m', '5m', '1d']
        .map(t => `<option value="${t}"${t === timeframe ? ' selected' : ''}>${t}</option>`)
        .join('');

    const body = `
        <div class="crumbs"><a href="/">Folders</a> / Import</div>
        <h1>Import historical data</h1>
        <form class="import" id="form">
            <label for="symbol">Symbol</label>
            <input id="symbol" name="symbol" required value="${escapeHtml(symbol)}" placeholder="AAPL" autocomplete="off">

            <label for="timeframe">Timeframe</label>
            <select id="timeframe" name="timeframe">${tfOpts}</select>

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
    return layout({
        title: 'Import',
        body,
        scripts: [{ src: '/assets/import-client.js', type: 'module' }]
    });
}

module.exports = { importPage };
