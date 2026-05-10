const { layout, escapeHtml, attr } = require('../layout');

function chartPage(f) {
    const ohlc = f.candles.map(c => [c[0] * 1000, c[1], c[2], c[3], c[4]]);
    const vol = f.candles.map(c => [c[0] * 1000, c[5]]);
    const payload = { symbol: f.symbol, timeframe: f.timeframe, ohlc, vol };
    const body = `
        <div class="crumbs">
            <a href="/">Folders</a> /
            <a href="/folder/${escapeHtml(f.ym)}">${escapeHtml(f.ym)}</a> /
            <a href="/file/${escapeHtml(f.ym)}/${escapeHtml(f.name)}">${escapeHtml(f.name)}</a> / Chart
        </div>
        <div id="chart" data-payload='${attr(payload)}'></div>`;
    return layout({
        title: `${f.symbol} ${f.timeframe} chart`,
        body,
        scripts: [
            '/vendor/highcharts/highstock.js',
            { src: '/assets/chart-client.js', type: 'module' }
        ]
    });
}

module.exports = { chartPage };
