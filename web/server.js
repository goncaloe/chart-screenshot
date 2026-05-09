const path = require('path');
const express = require('express');
const folders = require('./actions/folders');
const file = require('./actions/file');
const importAction = require('./actions/import');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/folders', folders.listFolders);
app.get('/api/folders/:ym', folders.listFiles);
app.get('/api/file/:ym/:name', file.getFile);
app.post('/api/import', importAction.postImport);

app.use('/vendor/highcharts', express.static(path.join(__dirname, '..', 'node_modules', 'highcharts')));
app.use(express.static(path.join(__dirname, 'views')));

const PORT = process.env.PORT || 3003;
app.listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
