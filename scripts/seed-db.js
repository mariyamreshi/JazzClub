const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // อ่าน seed.sql
    const seedPath = path.join(__dirname, '../database/seed.sql');
    const seedSQL = fs.readFileSync(seedPath, 'utf-8');

    // แยก SQL statements
    const statements = seedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // รัน SQL ทีละ statement
    const connection = await db.getConnection();
    try {
      for (const statement of statements) {
        console.log(`  ✓ Executing: ${statement.substring(0, 50)}...`);
        await connection.query(statement);
      }
      console.log('✅ Database seeded successfully!');
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
