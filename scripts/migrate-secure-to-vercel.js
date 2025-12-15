// One-off migration script to update stored signed URLs
// Replaces https://secure.crackoffcampus.com with https://crackoffcampus.vercel.app

const { pool } = require('../utils/db');

async function run() {
  try {
    const oldBase = 'https://crackoffcampus.vercel.app';
    const newBase = 'https://crackoffcampusserverw.onrender.com';


    // Adjust table/column names if needed
    const table = 'user_resources';
    const column = 'signed_url';

    console.log(`Updating ${table}.${column} from ${oldBase} to ${newBase}...`);

    const { rowCount } = await pool.query(
      `UPDATE ${table}
       SET ${column} = REPLACE(${column}, $1, $2)
       WHERE ${column} LIKE $1 || '%';`,
      [oldBase, newBase]
    );

    console.log(`Updated ${rowCount} row(s).`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
