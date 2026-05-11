const dilutionFetch = require('../core/dilution');
const minimist = require('minimist');


function dataToText(data){
    let text = [];
    if (data.shs_float) {
        text.push("Float: " + data.shs_float + "M");
    }
    if (data.inst_own) {
        text.push("Inst Own: " + data.inst_own + "%");
    }
    if (data.cps) {
        text.push("CPS: " + data.cps);
    }
    if (data.cash) {
        text.push("Cash: " + data.cash);
    }
    if (data.country) {
        text.push(data.country);
    }
    return text.join("\n");
}


//node cli/stockinfo.js --symbol=AKAN,INBS
async function stockInfo() {
    const args = minimist(process.argv.slice(2));

    if (typeof args.symbol !== 'string' || !args.symbol) {
        throw new Error("Param 'symbol' is required.");
    }

    const symbols = args.symbol
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

    if (!symbols.length) {
        throw new Error("No valid symbols provided.");
    }

    const symbolReg = /^[A-Z]{1,5}$/;

    for (const symbol of symbols) {
        if (!symbolReg.test(symbol)) {
            throw new Error(`Param 'symbol' contains invalid ticker: ${symbol}`);
        }
    }

    for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];

        const dt = await dilutionFetch(symbol);
        const text = dt ? dataToText(dt) : '';

        console.log(`${symbol}\n${text}`);

        // linha em branco entre blocos
        if (i < symbols.length - 1) {
            console.log('');
        }
    }

    setTimeout(() => process.exit(0), 0);
}

stockInfo();
