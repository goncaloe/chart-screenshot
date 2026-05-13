const fs = require('fs');
const path = require('path');
const { utcNyOffset } = require('./market');

function buildVolumeSeries(candles) {
    return candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.volume > 0 ? c.close >= c.open ? '#00aa00' : '#d20000' : 'rgba(0, 0, 0, 0)'
    }));
}

function normalizeCandles(raw) {
    const offset = utcNyOffset() / 1000;
    return raw.map(c => ({
        time: c[0] + offset, // lightweight does not have a timezone setting, we need to convert it to NY time
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
    }));
}

function calculateEMA(data, period) {
    const k = 2 / (period + 1);
    let ema = data[0].close;
    let result = [];

    for (let i = 0; i < data.length; i++) {
        ema = data[i].close * k + ema * (1 - k);
        result.push({
            time: data[i].time,
            value: +ema.toFixed(4)
        });
    }

    return result;
}

function calculateVWAP(data) {
    let cumulativePV = 0;
    let cumulativeVolume = 0;
    let currentDay = null;
    const result = [];
    for (const c of data) {
        const nyDay = (new Date(c.time * 1000)).getDay();
        if (currentDay !== nyDay) {
            cumulativePV = 0;
            cumulativeVolume = 0;
            currentDay = nyDay;
            continue;
        }

        cumulativePV += c.volume * (c.high + c.low + c.close) / 3;
        cumulativeVolume += c.volume;
        
        if(cumulativePV < 0.001){
            continue;
        }
        
        result.push({
            time: c.time,
            value: cumulativeVolume === 0 ? null : +(cumulativePV / cumulativeVolume).toFixed(4)
        });
    }
    return result;
}

module.exports = function buildPayload(file){
    const filepath = path.join(__dirname, '..', 'data', file);
    if(fs.existsSync(filepath) === false){
        throw new Error('File not found: ' + filepath);
    }
    filename = path.basename(filepath);
    const m = filename.match(/^([A-Z0-9.\-]+)_(1m|5m|1d)\.json$/);
    if (!m) {
        throw new Error('Invalid file format: ' + filename);
    }

    const raw = JSON.parse(fs.readFileSync(filepath));    
    const candles = normalizeCandles(raw);

    let result = {
        candles,
        volume: buildVolumeSeries(candles),
        ema9: calculateEMA(candles, 9),
        ema20: calculateEMA(candles, 20),
        symbol: m[1],
        timeframe: m[2],
        folder: path.dirname(file),
        filename: filename,
    };

    if(m[2] === '1m' || m[2] === '5m'){
        result.vwap = calculateVWAP(candles);
        result.ema80 = calculateEMA(candles, 80);
    }

    return result;
}
