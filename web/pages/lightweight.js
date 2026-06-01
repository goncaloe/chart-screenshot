const fs = require('fs');
const path = require('path');
const buildPayload = require('../../core/payload');

const TEMPLATE_PATH = path.join(__dirname, '..', 'views', 'lightweight.html');

function lightweightPage(ym, dd, name, aggregate) {
    if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error('Invalid ym');
    if (!/^\d{2}$/.test(dd)) throw new Error('Invalid dd');
    const payload = buildPayload(`${ym}/${dd}/${name}`, aggregate);
    payload.ym = ym;
    payload.dd = dd;
    const tpl = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    return tpl.replace('__PAYLOAD__', JSON.stringify(payload));
}

module.exports = { lightweightPage };
