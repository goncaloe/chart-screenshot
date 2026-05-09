import { api } from '../api.js';
import { escapeHtml } from '../app.js';

let HC = null;

async function loadHighcharts() {
    if (HC) return HC;
    await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = '/vendor/highcharts/highstock.js';
        s.onload = res;
        s.onerror = () => rej(new Error('Failed to load Highcharts'));
        document.head.appendChild(s);
    });
    HC = window.Highcharts;
    return HC;
}

export async function render({ ym, name }, root) {
    const f = await api.file(ym, name);
    root.innerHTML = `
        <div class="crumbs">
            <a href="#/">Folders</a> /
            <a href="#/folder/${escapeHtml(ym)}">${escapeHtml(ym)}</a> /
            <a href="#/file/${escapeHtml(ym)}/${escapeHtml(name)}">${escapeHtml(name)}</a> / Chart
        </div>
        <h1>${escapeHtml(f.symbol)} <span class="muted">${escapeHtml(f.timeframe)}</span></h1>
        <div id="chart"></div>`;
    const Highcharts = await loadHighcharts();
    const ohlc = f.candles.map(c => [c[0] * 1000, c[1], c[2], c[3], c[4]]);
    const vol = f.candles.map(c => [c[0] * 1000, c[5]]);
    
    Highcharts.setOptions({ time: { timezone: 'America/New_York' } });
    Highcharts.stockChart('chart', {
        rangeSelector: { selected: 1 },
        title: { text: `${f.symbol} ${f.timeframe}` },
        plotOptions: {
            series: {
                dataGrouping: { enabled: false },
            },
            candlestick: {
                gapSize: 1.5,
                gapUnit: 'relative',
            },
            column: {
                gapSize: 1.5,
                gapUnit: 'relative',
            },
        },        
        yAxis: [
            { labels: { align: 'right', x: -3 }, title: { text: 'OHLC' }, height: '70%', lineWidth: 2 },
            { labels: { align: 'right', x: -3 }, title: { text: 'Volume' }, top: '72%', height: '28%', offset: 0, lineWidth: 2 }
        ],
        series: [
            { type: 'candlestick', name: f.symbol, data: ohlc, dataGrouping: { enabled: false } },
            { type: 'column', name: 'Volume', data: vol, yAxis: 1, dataGrouping: { enabled: false } }
        ],
    });
}
