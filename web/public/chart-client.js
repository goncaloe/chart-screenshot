const el = document.getElementById('chart');
const payload = JSON.parse(el.dataset.payload);
const Highcharts = window.Highcharts;
Highcharts.setOptions({ time: { timezone: 'America/New_York' } });
Highcharts.stockChart('chart', {
    rangeSelector: { selected: 1 },
    title: { text: `${payload.symbol} ${payload.timeframe}` },
    plotOptions: {
        series: { dataGrouping: { enabled: false } },
        candlestick: { gapSize: 1.5, gapUnit: 'relative' },
        column: { gapSize: 1.5, gapUnit: 'relative' }
    },
    yAxis: [
        { labels: { align: 'right', x: -3 }, title: { text: 'OHLC' }, height: '70%', lineWidth: 2 },
        { labels: { align: 'right', x: -3 }, title: { text: 'Volume' }, top: '72%', height: '28%', offset: 0, lineWidth: 2 }
    ],
    series: [
        { type: 'candlestick', name: payload.symbol, data: payload.ohlc, dataGrouping: { enabled: false } },
        { type: 'column', name: 'Volume', data: payload.vol, yAxis: 1, dataGrouping: { enabled: false } }
    ]
});
