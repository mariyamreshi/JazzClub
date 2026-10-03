const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function initDatabase() {
  try {
    console.log('🔧 Initializing database schema...');

    // อ่าน schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    // แยก SQL statements (แต่ละ statement จบด้วย ;)
    const statements = schemaSQL
      .replace(/^\s*--.*$/gm, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // รัน SQL ทีละ statement
    const connection = await db.getConnection();
    try {
      for (const statement of statements) {
        console.log(`  ✓ Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }
      // CREATE TABLE IF NOT EXISTS does not update an existing installation.
      const [indexes] = await connection.query(
        "SHOW INDEX FROM reservations WHERE Key_name = 'reservations_date_table_unique'"
      );
      if (indexes.length === 0) {
        const [duplicates] = await connection.query(
          'SELECT 1 FROM reservations GROUP BY `date`, table_number HAVING COUNT(*) > 1 LIMIT 1'
        );
        if (duplicates.length > 0) {
          throw new Error('Existing reservations contain duplicate table/date pairs. Review these bookings before adding the daily booking constraint. No reservations were deleted.');
        }
        const migration = fs.readFileSync(path.join(__dirname, '../database/migrations/001-reservation-per-day.sql'), 'utf8');
        await connection.query(migration);
      }
      console.log('✅ Database schema initialized successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error initializing database:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

initDatabase();
