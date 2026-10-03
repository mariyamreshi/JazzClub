const mysql = require('mysql2/promise');
const env = require('./env');

// Connections are opened only when a model runs a query.
const pool = mysql.createPool({
  ...env.database,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 20,
  connectTimeout: 5000,
  charset: 'utf8mb4',
});

module.exports = pool;
