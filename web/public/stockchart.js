const el = document.getElementById('chart');
const payload = JSON.parse(el.dataset.payload);
const Highcharts = window.Highcharts;
Highcharts.setOptions({ time: { timezone: 'America/New_York' } });

const nyParts = (() => {
    const f = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York', hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    return (ms) => {
        const out = {};
        for (const p of f.formatToParts(new Date(ms))) {
            if (p.type !== 'literal') out[p.type] = p.value;
        }
        return out;
    };
})();

function nyOffsetMinutes(utcMs) {
    const p = nyParts(utcMs);
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return Math.round((asUTC - utcMs) / 60000);
}

function nyMidnightMs(year, month, day) {
    const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
    const off = nyOffsetMinutes(guess);
    const utc = guess - off * 60000;
    const off2 = nyOffsetMinutes(utc);
    return off2 === off ? utc : guess - off2 * 60000;
}

const dayPlotLines = [];
let prevDayKey = null;
let isFirstDay = true;
for (const row of payload.ohlc) {
    const p = nyParts(row[0]);
    const key = `${p.year}-${p.month}-${p.day}`;
    if (key !== prevDayKey) {
        if (!isFirstDay) {
            dayPlotLines.push({
                value: nyMidnightMs(+p.year, +p.month, +p.day),
                color: '#888',
                dashStyle: 'Dash',
                width: 1,
                zIndex: 5
            });
        }
        isFirstDay = false;
        prevDayKey = key;
    }
}

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
    xAxis: {
        plotLines: dayPlotLines
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
