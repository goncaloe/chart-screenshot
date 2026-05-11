const { chromium } = require('playwright');

//Open terminal and execute the command:
//"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDebugProfile"
//Then do the login.


async function waitForEnter(message) {
    return new Promise(resolve => {
        process.stdout.write(message);
        process.stdin.resume();
        process.stdin.once('data', () => {
            process.stdin.pause();
            resolve();
        });
    });
}



function advancedRound(num) {
    // Não mexe em números menores que 1
    if (num < 1) return Number(num);

    const lft = Math.floor(num);
    const decimal = num - lft;

    // Define número de casas decimais com base na magnitude
    let places;
    if (lft >= 10) {
        places = 0; // números grandes → sem casas decimais
    } else if (lft >= 2) {
        places = 1; // médios → 1 casa decimal
    } else {
        places = 2;
    }

    // Verifica proximidade de número inteiro (ex: 9.93 → 10)
    if (decimal >= 0.9) {
        return Math.ceil(num);
    }

    // Verifica proximidade inferior (ex: 10.02 → 10)
    if (decimal <= 0.1 && lft >= 10) {
        return lft;
    }

    // Arredondamento normal com casas definidas
    const factor = Math.pow(10, places);
    return factor > 0 ? Math.round(num * factor) / factor : Math.round(num);
}


module.exports = async function dilutionFetch(symbol) {
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0] ?? await browser.newContext();
    const pages = context.pages();
    const page = pages.length ? pages[0] : await context.newPage();

    async function tryLoadTicker() {
        await page.goto(`https://dilutiontracker.com/app/search/${symbol}`, {
            waitUntil: 'networkidle'
        });

        try {
            await page.waitForSelector('#companyDesc', {
                timeout: 8000
            });
            return true;
        } catch {
            return false;
        }
    }

    let logged = await tryLoadTicker();

    if (!logged) {
        await page.goto('https://dilutiontracker.com/login', {
            waitUntil: 'networkidle'
        });

        console.log('\nDilutionTracker login required.');
        await waitForEnter('After login press ENTER here to continue.');

        logged = await tryLoadTicker();

        if (!logged) {
            throw new Error('Login failed or ticker page not loaded.');
        }
    }

    const bodyText = await page.evaluate(() => document.body.innerText);

    //await new Promise(r => setTimeout(r, 1000));
    if(bodyText.length < 500){
        console.log('Error: Only gets: ' + bodyText.length + ' bytes')
        console.log(bodyText);
        return null;
    }

    if(bodyText.indexOf("Dilution might not matter") > -1){
        return null
    }

    let m;
    m = bodyText.match(/Float\s*&\s*OS:\s*(\d+(?:\.\d+)?)M\s*\/?/i);
    const cfloat = m ? advancedRound(m[1].trim()) : null;
    m = bodyText.match(/Inst\s*Own:\s*([\d.-]+)%/i);
    const inst_own = m ? advancedRound(m[1].trim()) : null;
    m = bodyText.match(/Net\s*Cash\/Sh[:\s]*([-\d.]+)/i);
    const cps = m ? advancedRound(m[1].trim()) : null;

    let country = null;
    m = bodyText.match(/Country:(.*)Exchange:/i);
    if (m && m[1] !== 'U.S'){
        country = m[1];
    }

    let cash = null;
    if(bodyText.indexOf("The company is cashflow positive") > -1){
        cash = 'positive';
    }
    else {
        m = bodyText.match(/The company has\s+(\d+(?:\.\d+)?)\s+months of cash left/i);
        if (m) {
            cash = advancedRound(m[1]);
        }
    }

    const result = {
        cfloat,
        inst_own,
        cps,
        cash,
        country,
    };
    
    return result;
}