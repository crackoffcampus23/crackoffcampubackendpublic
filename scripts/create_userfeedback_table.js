const { init, pool } = require('../utils/db');

async function run() {
  try {
    await init();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS userfeedback (
        feedback_id VARCHAR(9) PRIMARY KEY,
        name TEXT,
        phone_number TEXT,
        proof_url TEXT,
        feedback_type TEXT,
        message TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_userfeedback_updated_at'
        ) THEN
          CREATE TRIGGER trg_userfeedback_updated_at
          BEFORE UPDATE ON userfeedback
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);
    console.log('userfeedback table ready');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

run();
