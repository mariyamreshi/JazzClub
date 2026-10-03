const env = require('./config/env');
const app = require('./app');
const db = require('./config/db');

const server = app.listen(env.port, env.host, () => {
  console.log(`JazzClub running at http://${env.host}:${env.port}`);
  console.log('Check MySQL separately with: npm run db:check');
});

server.on('error', async (error) => {
  console.error(`Server could not start (${error.code || 'UNKNOWN_ERROR'}).`);
  await db.end();
  process.exitCode = 1;
});

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    try {
      await db.end();
    } catch {
      process.exitCode = 1;
    } finally {
      clearTimeout(timeout);
    }
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
