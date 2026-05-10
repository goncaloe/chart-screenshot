const el = document.getElementById('chart');
const payload = JSON.parse(el.dataset.payload);
const Highcharts = window.Highcharts;
Highcharts.setOptions({ time: { timezone: 'America/New_York' } });
Highcharts.stockChart('chart', {
    rangeSelector: { 
        buttons: [
            {
                type: 'day',
                count: 1,
                text: '1d'
            }, 
            {
                type: 'all',
                text: 'All'
            }
        ],
        inputEnabled: true,
        selected: 1
    },
    title: { text: '' },
    tooltip: {
        enabled: false
    },
    navigator: {
        enabled: false
    },
    plotOptions: {
        candlestick: {
            color: '#ff0000a8',
            upColor: '#00ff009a',
            groupPadding: 0.1, // Padrão é 0.2. Diminua para aproximar as velas.
            pointPadding: 0.05,  // Espaço entre as velas individuais.
            states: {
                hover: {       
                    enabled: false 
                }
            },
            wick: { 
                strokeWidth: 0.5,
                color: '#ffffff'
            }
        },
        column: {
            pointPadding: 0,
            borderWidth: 0
        },
        series: {
            turboThreshold: 0
        }
    },
    yAxis: [
        { 
            labels: { align: 'right', x: -3 }, 
            title: { text: 'OHLC' }, 
            height: '70%', 
            lineWidth: 1 
        },
        { 
            labels: { align: 'right', x: -3 }, 
            title: { text: 'Volume' }, 
            top: '70%', 
            height: '30%', 
            offset: 0, 
            lineWidth: 1,
            maxPadding: 0.1,      // Remove o espaço acima da maior coluna
            endOnTick: false,   // Impede que o eixo force um espaço para alinhar com um tick
            gridLineWidth: 0    // Opcional: remove as linhas de grade para um visual mais limpo
        }
    ],
    series: [
        { type: 'candlestick', name: payload.symbol, data: payload.ohlc, dataGrouping: { enabled: false } },
        { type: 'column', name: 'Volume', data: payload.vol, yAxis: 1, dataGrouping: { enabled: false } }
    ]
});
