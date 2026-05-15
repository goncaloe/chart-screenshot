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


module.exports = async function dilutionFetch(symbol, newsStartDate, newsEndDate) {
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
    const shs_float = m ? advancedRound(m[1].trim()) : null;
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

    const newsData = newsStartDate && newsEndDate ? await page.evaluate(async (sym) => {
        try {
            const r = await fetch(`https://api.dilutiontracker.com/v1/getOhlcvTimeSeriesWithNews?ticker=${sym}`, { credentials: 'include' });
            if (!r.ok) return null;
            return await r.json();
        } catch {
            return null;
        }
    }, symbol) : null;

    const formatNewsDate = (s) => {
        const m = s.match(/^(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+):\d+\s*(AM|PM)/i);
        if (!m) return null;
        const [, mon, day, year, hh, mm, ampm] = m;
        let h = Number(hh) % 12;
        if (ampm.toUpperCase() === 'PM') h += 12;
        const pad = n => String(n).padStart(2, '0');
        return `${year}-${pad(Number(mon))}-${pad(Number(day))} ${pad(h)}:${pad(Number(mm))}`;
    };

    const news = [];
    if (newsData && Array.isArray(newsData.news)) {
        const newsStartDateMs = new Date(newsStartDate).getTime();
        const newsEndDateMs = new Date(newsEndDate).getTime();
        const seen = new Set();
        for (const n of newsData.news) {
            const raw = n.publishedAtDateTimeString;
            if (!raw) continue;
            const ts = new Date(raw).getTime();
            if (!Number.isFinite(ts) || ts < newsStartDateMs || ts > newsEndDateMs) continue;
            const date = formatNewsDate(raw);
            if (!date || seen.has(date)) continue;
            seen.add(date);
            news.push({ title: n.title, date });
        }
    }

    const cleanObj = function(obj) {
        for (var propName in obj) {
            if (obj[propName] === null || obj[propName] === undefined) {
            delete obj[propName];
            }
        }
        return obj;
    }

    return cleanObj({
        shs_float,
        inst_own,
        cps,
        cash,
        country,
        news,
    });
}