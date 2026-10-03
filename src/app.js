const path = require('node:path');
const express = require('express');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error-handler');
zzgbhgbik
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Serve static frontend files from public folder
app.use(express.static(path.resolve(__dirname, '../public')));

// API and view routes
app.use(routes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

module.exports = app;