const { pool } = require('../utils/db');
const { ensureTable } = require('../models/adBannerModel');

(async () => {
  try {
    await ensureTable();
    console.log('adbanner table ensured (created if missing) and single row seeded.');
  } catch (e) {
    console.error('Error ensuring adbanner table:', e);
    process.exitCode = 1;
  } finally {
    try { await pool.end(); } catch {}
  }
})();