const path = require('node:path');
const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use(express.static(path.resolve(__dirname, '../public')));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

app.use(express.static('public'));

app.get('/overview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/admin/overview.html'));
});

module.exports = app;