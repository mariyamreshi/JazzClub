const db = require('../src/config/db');
const { checkConnection } = require('../src/models/health.model');

const hints = {
  ECONNREFUSED: 'Start MySQL and check DB_HOST / DB_PORT in .env.',
  ENOTFOUND: 'Check DB_HOST in .env.',
  ETIMEDOUT: 'Check that the MySQL host and port are reachable.',
  PROTOCOL_SEQUENCE_TIMEOUT: 'MySQL did not respond to the query in time.',
  ER_ACCESS_DENIED_ERROR: 'Check DB_USER / DB_PASSWORD and MySQL user permissions.',
  ER_BAD_DB_ERROR: 'Create the database named in DB_NAME before trying again.',
};

async function main() {
  try {
    if (!await checkConnection()) throw new Error('Unexpected query result.');
    console.log('MySQL connected: SELECT 1 succeeded.');
  } catch (error) {
    console.error(`MySQL check failed (${error.code || 'UNKNOWN_ERROR'}).`);
    console.error(hints[error.code] || 'Check your MySQL server and .env configuration.');
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
