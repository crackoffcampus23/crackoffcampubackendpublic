require('dotenv').config();
const { init, pool } = require('../utils/db');

async function run() {
  try {
    await init();
    console.log('Creating user_interview_kits table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_interview_kits (
        user_id VARCHAR(50) NOT NULL,
        kit_id VARCHAR(50) NOT NULL,
        kit_url TEXT,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        PRIMARY KEY (user_id, kit_id)
      );
    `);
    console.log('Table created successfully.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
