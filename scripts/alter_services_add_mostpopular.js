const { init, pool } = require("../utils/db");

async function run() {
  try {
    await init();
    await pool.query(
      "ALTER TABLE services ADD COLUMN IF NOT EXISTS mostpopular BOOLEAN NOT NULL DEFAULT false;"
    );
    console.log("services.mostpopular column added/ensured with default false");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  }
}

run();
