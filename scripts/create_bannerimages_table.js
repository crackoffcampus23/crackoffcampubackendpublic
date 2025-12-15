const { init, pool } = require('../utils/db');

async function run() {
  try {
    await init();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bannerimages (
        banner_image_id VARCHAR(7) PRIMARY KEY,
        banner_image_url TEXT NOT NULL,
        banner_image_link TEXT,
        banner_position INTEGER NOT NULL,
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
          SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bannerimages_updated_at'
        ) THEN
          CREATE TRIGGER trg_bannerimages_updated_at
          BEFORE UPDATE ON bannerimages
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END$$;
    `);
    console.log('bannerimages table ready');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  }
}

run();
