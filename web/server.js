const path = require('path');
const express = require('express');

const foldersAction = require('./actions/folders');
const fileAction = require('./actions/file');
const importAction = require('./actions/import');
const rangeAction = require('./actions/range');
const stockinfoAction = require('./actions/stockinfo');

const { foldersPage } = require('./pages/folders');
const { filesPage } = require('./pages/files');
const { filePage } = require('./pages/file');
const { chartPage } = require('./pages/chart');
const { importPage } = require('./pages/import');
const { lightweightPage } = require('./pages/lightweight');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/', (req, res) => {
    res.send(foldersPage(foldersAction.getFolders()));
});

app.get('/folder/:ym', (req, res) => {
    try {
        const day = req.query.day ? Number(req.query.day) : null;
        const timeframe = req.query.timeframe || null;
        res.send(filesPage(foldersAction.getFiles(req.params.ym, day, timeframe)));
    } catch (e) {
        res.status(400).send(`<pre>${e.message}</pre>`);
    }
});

app.get('/file/:ym/:name', (req, res) => {
    try {
        res.send(filePage(fileAction.getFile(req.params.ym, req.params.name)));
    } catch (e) {
        res.status(404).send(`<pre>${e.message}</pre>`);
    }
});

app.get('/chart/:ym/:name', (req, res) => {
    try {
        res.send(chartPage(fileAction.getFile(req.params.ym, req.params.name)));
    } catch (e) {
        res.status(404).send(`<pre>${e.message}</pre>`);
    }
});

app.get('/import', (req, res) => {
    res.send(importPage(req.query));
});

app.get('/lightweight/:ym/:name', (req, res) => {
    try {
        res.send(lightweightPage(req.params.ym, req.params.name));
    } catch (e) {
        res.status(404).send(`<pre>${e.message}</pre>`);
    }
});

app.post('/api/import', importAction.postImport);
app.post('/api/range', rangeAction.postRange);
app.post('/api/stockinfo', stockinfoAction.postFetchMeta);

app.use('/vendor/highcharts', express.static(path.join(__dirname, '..', 'node_modules', 'highcharts')));
app.use('/assets', express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3005;
app.listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
