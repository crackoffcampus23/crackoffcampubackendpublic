const { pool } = require('../utils/db');

async function addProfileUrlColumn() {
  console.log('Adding profile_url column to userfeedback table if it does not exist...');
  await pool.query(
    `ALTER TABLE userfeedback
     ADD COLUMN IF NOT EXISTS profile_url TEXT;`
  );
  console.log('profile_url column check/creation completed.');
}

addProfileUrlColumn()
  .then(() => {
    console.log('Migration completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error running migration:', err);
    process.exit(1);
  });
