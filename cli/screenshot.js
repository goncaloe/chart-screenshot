const minimist = require('minimist');
const path = require('path');
const { renderChart, closeRenderer } = require('../core/renderer');
const buildPayload = require('../core/payload');

/**
 * Generates a screenshot of the chart based on the provided JSON payload file.
 * Example usage:
 * node cli/screenshot --file=KIDZ-5m-2026-04-29
 */ 
async function screenshot() {
    const args = minimist(process.argv.slice(2));

    if(typeof args.file !== 'string' || !args.file){
        throw new Error('Param file is required.');
    }
    let jsonFile = args.file;
    if(!jsonFile.endsWith('.json')){
        jsonFile += '.json';
    }

    const payload = buildPayload(jsonFile);

    let outFile = path.join(__dirname, '..', 'screenshots', jsonFile.split('.')[0] + '.png');

    await renderChart(payload, outFile);
    await closeRenderer();

    console.log(`${outFile} generated`);
}

screenshot();