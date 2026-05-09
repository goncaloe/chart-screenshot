const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');


let browser;

function buildHTML(payload) {
    const htmlTemplate = fs.readFileSync(path.join(__dirname, '..', 'web', 'views', 'lightweight.html'), 'utf8');
    const html = htmlTemplate.replace('__PAYLOAD__', JSON.stringify(payload));
    return html;
}

async function initRenderer() {
    if (!browser) {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox']
        });
    }
}

async function renderChart(payload, outputFile) {
    await initRenderer();

    const page = await browser.newPage({
        viewport: {
            width: 1820,
            height: 840
        }
    });

    const html = buildHTML(payload);

    await page.setContent(html, {
        waitUntil: 'networkidle'
    });

    //await new Promise(r => setTimeout(r, 300));

    const graphElement = page.locator('#chart');
    await graphElement.screenshot({
        path: outputFile,
        type: 'png',
    });

    await page.close();
}


async function closeRenderer() {
    if (browser) await browser.close();
}

module.exports = {
    renderChart,
    closeRenderer
};