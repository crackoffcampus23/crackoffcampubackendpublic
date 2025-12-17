const { init, pool } = require('../utils/db');

async function run() {
  try {
    await init();
    await pool.query(`ALTER TABLE sponsorship_marquee ALTER COLUMN company_name DROP NOT NULL;`);
    console.log('sponsorship_marquee.company_name set to NULLABLE');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

run();
