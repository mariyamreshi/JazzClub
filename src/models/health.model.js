const db = require('../config/db');

async function checkConnection() {
  const [rows] = await db.query({ sql: 'SELECT 1 AS connected', timeout: 5000 });
  return rows[0].connected === 1;
}

module.exports = { checkConnection };
