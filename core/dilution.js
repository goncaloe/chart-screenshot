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


const MONTHS = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

// Maps an offering instrument title to a normalized type. Keyword order matters:
// e.g. a "Convertible Preferred" must resolve to convertible before "warrant".
function classifyOffering(title) {
    if (/\bATM\b/i.test(title)) return 'atm';
    if (/equity line|\bSPA\b/i.test(title)) return 'equityLine';
    if (/convertible|\bnote\b/i.test(title)) return 'convertible';
    if (/\bshelf\b/i.test(title)) return 'shelf';
    if (/warrant|pre-?funded|investment option/i.test(title)) return 'warrant';
    if (/S-1|S-3|offering/i.test(title)) return 's1';
    return null;
}

// The DilutionTracker page lists each offering instrument under a "Month YYYY <name>"
// heading (free), while the "Completed Offerings" table at the bottom is premium and
// returned blurred — so we only scan the region before it.
function parseOfferings(bodyText) {
    const cut = bodyText.lastIndexOf('Completed Offerings');
    const region = cut > -1 ? bodyText.slice(0, cut) : bodyText;
    const titleRe = /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
    const offerings = [];
    for (const line of region.split('\n')) {
        const t = line.trim();
        const m = t.match(titleRe);
        if (!m) continue;
        const type = classifyOffering(t);
        if (!type) continue;
        const date = new Date(Date.UTC(Number(m[2]), MONTHS[m[1].toLowerCase()], 1));
        offerings.push({ type, label: t, date: date.toISOString().slice(0, 10) });
    }
    return offerings;
}

// Parses the "Cash Position" sentence: runway in months, quarterly burn ($M) and
// current cash ($M). Values can be negative (already out of cash).
function parseCashPosition(bodyText) {
    if (/The company is cashflow positive/i.test(bodyText)) return { positive: true };
    const full = bodyText.match(/The company has\s+(-?\d+(?:\.\d+)?)\s+months of cash left based on quarterly cash burn of\s+(-?\$?-?[\d.]+)M\s+and estimated current cash of\s+\$?(-?[\d.]+)M/i);
    if (full) {
        return {
            runwayMonths: Number(full[1]),
            quarterlyBurn: Number(full[2].replace(/[^0-9.\-]/g, '')),
            currentCash: Number(full[3]),
        };
    }
    const m = bodyText.match(/The company has\s+(-?\d+(?:\.\d+)?)\s+months of cash left/i);
    return m ? { runwayMonths: Number(m[1]) } : {};
}

// Ratio of latest shares outstanding to the value ~4 quarters earlier (getSharesOS API).
function computeOsGrowth(data) {
    const ts = data && Array.isArray(data.timeSeriesData) ? data.timeSeriesData : null;
    if (!ts) return null;
    const hist = ts.filter(d => typeof d['Historical Outstanding'] === 'number' && d['Historical Outstanding'] > 0);
    if (hist.length < 2) return null;
    const latest = hist[hist.length - 1]['Historical Outstanding'];
    const prior = hist[Math.max(0, hist.length - 5)]['Historical Outstanding'];
    return prior > 0 ? latest / prior : null;
}

// Heuristic dilution-risk inference. DilutionTracker's official rating is premium-gated,
// so this is our own estimate weighted by how recent each signal is (more recent = higher
// risk). Returns { level, score (0-100), factors[] }.
function computeDilutionRisk({ cashPos, offerings, osGrowth }, now = Date.now()) {
    const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;
    const factors = [];
    let score = 0;

    // 1) Cash runway / burn pressure (max 35).
    if (!cashPos.positive && typeof cashPos.runwayMonths === 'number') {
        const r = cashPos.runwayMonths;
        let c = 0;
        if (r < 0) c = 35; else if (r < 3) c = 30; else if (r < 6) c = 22; else if (r < 12) c = 14; else if (r < 24) c = 6;
        score += c;
        if (c >= 14) factors.push(`runway ${r}mo`);
    }

    // 2) Active offering instruments, weighted by type and recency (max 40).
    const typeWeight = { atm: 18, equityLine: 14, convertible: 12, s1: 10, shelf: 10, warrant: 6 };
    const recentByType = {};
    for (const o of offerings) {
        const monthsAgo = (now - new Date(o.date).getTime()) / MONTH_MS;
        if (!recentByType[o.type] || monthsAgo < recentByType[o.type].monthsAgo) {
            recentByType[o.type] = { monthsAgo, label: o.label };
        }
    }
    let offScore = 0;
    for (const type of Object.keys(recentByType)) {
        const { monthsAgo, label } = recentByType[type];
        let f = 0;
        if (monthsAgo <= 6) f = 1; else if (monthsAgo <= 12) f = 0.6; else if (monthsAgo <= 24) f = 0.25;
        const c = (typeWeight[type] || 5) * f;
        offScore += c;
        if (c >= 5) factors.push(label.length > 40 ? label.slice(0, 40) : label);
    }
    score += Math.min(offScore, 40);

    // 3) Demonstrated dilution — shares-outstanding growth over the last year (max 25).
    if (typeof osGrowth === 'number') {
        let c = 0;
        if (osGrowth >= 3) c = 25; else if (osGrowth >= 2) c = 18; else if (osGrowth >= 1.5) c = 12; else if (osGrowth >= 1.2) c = 6;
        score += c;
        if (c > 0) factors.push(`OS +${Math.round((osGrowth - 1) * 100)}% 12mo`);
    }

    score = Math.min(Math.round(score), 100);
    let level;
    if (score >= 70) level = 'critical';
    else if (score >= 45) level = 'high';
    else if (score >= 22) level = 'medium';
    else level = 'low';
    return { level, score, factors };
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

    const cashPos = parseCashPosition(bodyText);
    let cash = null;
    if (cashPos.positive) {
        cash = 'positive';
    } else if (typeof cashPos.runwayMonths === 'number') {
        cash = advancedRound(cashPos.runwayMonths);
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

    const sharesOSData = await page.evaluate(async (sym) => {
        try {
            const r = await fetch(`https://api.dilutiontracker.com/v1/getSharesOS?ticker=${sym}`, { credentials: 'include' });
            if (!r.ok) return null;
            return await r.json();
        } catch {
            return null;
        }
    }, symbol);

    const offerings = parseOfferings(bodyText);
    const osGrowth = computeOsGrowth(sharesOSData);
    const dilution_risk = computeDilutionRisk({ cashPos, offerings, osGrowth });

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
        dilution_risk,
    });
}

module.exports.parseOfferings = parseOfferings;
module.exports.parseCashPosition = parseCashPosition;
module.exports.computeOsGrowth = computeOsGrowth;
module.exports.computeDilutionRisk = computeDilutionRisk;