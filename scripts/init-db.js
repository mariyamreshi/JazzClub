const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

function sqlStatements(contents) {
  return contents
    .replace(/^\s*--.*$/gm, '')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function initDatabase() {
  try {
    console.log('🔧 Initializing database schema...');

    // อ่าน schema.sql
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    const connection = await db.getConnection();
    try {
      // Migrate the legacy table-based ORDER before schema.sql creates
      // triggers that expect the proposal-aligned total_amount column.
      let legacyOrderColumn = [];
      try {
        [legacyOrderColumn] = await connection.query("SHOW COLUMNS FROM orders LIKE 'table_id'");
      } catch (error) {
        if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
      }
      if (legacyOrderColumn.length > 0) {
        const migration = fs.readFileSync(
          path.join(__dirname, '../database/migrations/010-align-orders-reservations-and-constraints.sql'),
          'utf8'
        );
        for (const statement of sqlStatements(migration)) {
          await connection.query(statement);
        }
      }

      // Run the canonical schema after migrations.
      const statements = sqlStatements(schemaSQL);
      for (const statement of statements) {
        console.log(`  ✓ Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }
      // CREATE TABLE IF NOT EXISTS does not update an existing installation.
      const [stockColumns] = await connection.query(
        "SHOW COLUMNS FROM menu_items LIKE 'stock_quantity'"
      );
      if (stockColumns.length === 0) {
        const migration = fs.readFileSync(
          path.join(__dirname, '../database/migrations/003-align-menu-item-with-erd.sql'),
          'utf8'
        );
        for (const statement of sqlStatements(migration)) {
          await connection.query(statement);
        }
      }
      const [normalizedReservationColumns] = await connection.query(
        "SHOW COLUMNS FROM reservations LIKE 'customer_id'"
      );
      if (normalizedReservationColumns.length === 0) {
        const migration = fs.readFileSync(
          path.join(__dirname, '../database/migrations/004-normalize-reservations-and-shows.sql'),
          'utf8'
        );
        for (const statement of sqlStatements(migration)) {
          await connection.query(statement);
        }
      }
      const [shiftTable] = await connection.query("SHOW TABLES LIKE 'employee_shifts'");
      if (shiftTable.length === 0) {
        const migration = fs.readFileSync(
          path.join(__dirname, '../database/migrations/009-create-employee-schedules-and-shifts.sql'),
          'utf8'
        );
        for (const statement of sqlStatements(migration)) {
          await connection.query(statement);
        }
      }
      console.log('✅ Database schema initialized successfully!');
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error initializing database:');
    console.error(error.message);
    if (error.code === 'ER_TABLEACCESS_DENIED_ERROR' || error.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.error('Run the SQL migration in MySQL Workbench with an administrator connection; the application account is intentionally limited to CRUD operations.');
    }
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

initDatabase();
