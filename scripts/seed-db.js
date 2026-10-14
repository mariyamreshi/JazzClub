const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');

    const statements = seedSQL
      .replace(/^\s*--.*$/gm, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      for (const statement of statements) {
        console.log(`  ✓ Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }
      await connection.commit();
      console.log('✅ Database seeded successfully!');
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Error seeding database:');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

seedDatabase();
