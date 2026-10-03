const healthModel = require('../models/health.model');

function server(req, res) {
  res.json({ data: { server: 'ok' } });
}

async function database(req, res) {
  try {
    const connected = await healthModel.checkConnection();
    if (!connected) throw new Error('Database check did not succeed.');
    res.json({ data: { database: 'ok' } });
  } catch {
    // Keep database credentials and internal errors out of HTTP responses.
    res.status(503).json({
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Cannot connect to MySQL. Run npm run db:check on the server.',
      },
    });
  }
}

module.exports = { server, database };
