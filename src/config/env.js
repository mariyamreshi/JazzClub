
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

function port(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return value;
}

module.exports = {
  host: process.env.HOST || '127.0.0.1',
  port: port('PORT', 3000),
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: port('DB_PORT', 3306),
    database: process.env.DB_NAME || 'jazzclub',
    user: process.env.DB_USER || 'jazzclub_app',
    password: process.env.DB_PASSWORD || '',
  },
};
