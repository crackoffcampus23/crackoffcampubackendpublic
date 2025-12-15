const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('POSTGRES_URL missing in environment');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(10) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT,
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`);

  // user_details
  await pool.query(`CREATE TABLE IF NOT EXISTS user_details (
    user_id VARCHAR(10) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    user_type TEXT DEFAULT 'free',
    plan_type TEXT,
    user_profile_bg TEXT,
    user_pfp TEXT,
    user_description TEXT,
    skill_and_expertise TEXT,
    experience JSONB,
    education JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  // Backfill new columns on existing databases
  await pool.query(`ALTER TABLE user_details ADD COLUMN IF NOT EXISTS plan_type TEXT;`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_details_type ON user_details (user_type);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_details_plan_type ON user_details (plan_type);`);

  // jobs
  await pool.query(`CREATE TABLE IF NOT EXISTS jobs (
    job_id VARCHAR(12) PRIMARY KEY,
    type TEXT, -- job | internship (category)
    job_type TEXT, -- premium/free
    job_role TEXT,
    company_giving TEXT,
    last_date_to_apply DATE,
    location TEXT,
    who_can_apply TEXT, -- e.g. experience/fresher/batch: 2025/26/27
    redirect_link TEXT,
    user_clicked_apply_now INTEGER DEFAULT 0,
    recruiter_email TEXT,
    employee_email TEXT,
    referral_form_link TEXT,
    hiring_form TEXT,
    description TEXT,
    stipend TEXT,
    ppo BOOLEAN,
    ppo_offer TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs (job_type);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs (type);`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;`);
  // Backfill newly added columns for existing DBs
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS type TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recruiter_email TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employee_email TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS referral_form_link TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hiring_form TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS description TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stipend TEXT;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ppo BOOLEAN;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ppo_offer TEXT;`);
  // If previously created as BOOLEAN, attempt safe conversion to TEXT
  try {
    await pool.query(`DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='jobs' AND column_name='ppo_offer' AND data_type='boolean'
      ) THEN
        ALTER TABLE jobs ALTER COLUMN ppo_offer TYPE TEXT USING CASE WHEN ppo_offer IS TRUE THEN 'true' WHEN ppo_offer IS FALSE THEN 'false' ELSE NULL END;
      END IF;
    END$$;`);
  } catch (e) {
    console.warn('Could not convert ppo_offer boolean to text:', e.message);
  }

  // services
  await pool.query(`CREATE TABLE IF NOT EXISTS services (
    service_id VARCHAR(12) PRIMARY KEY,
    service_title TEXT NOT NULL,
    short_description TEXT,
    duration_meeting TEXT,
    service_charge NUMERIC,
    more_details_section TEXT,
    what_booking_includes JSONB,
    user_registered INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;`);

  // resources
  await pool.query(`CREATE TABLE IF NOT EXISTS resources (
    resource_id VARCHAR(12) PRIMARY KEY,
    resource_name TEXT NOT NULL,
    short_description TEXT,
    what_you_get TEXT,
    download_link TEXT,
    resource_fee NUMERIC,
    total_downloads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  // Backfill newly added columns for existing databases
  await pool.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_fee NUMERIC;`);
  await pool.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;`);
  await pool.query(`ALTER TABLE resources ADD COLUMN IF NOT EXISTS banner_image TEXT;`);

  // testimonials
  await pool.query(`CREATE TABLE IF NOT EXISTS testimonials (
    testimonial_id VARCHAR(12) PRIMARY KEY,
    pfp TEXT,
    student_name TEXT,
    role_working TEXT,
    company_working TEXT,
    reviews TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  // Backfill/extend schema for new testimonial requirements
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS video_story_id VARCHAR(6);`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_testimonials_video_story_id ON testimonials (video_story_id);`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS image_url TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS student_role TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS salary TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS company TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS company_logo TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS video_url TEXT;`);
  await pool.query(`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS description TEXT;`);

  // previously_asked_questions
  await pool.query(`CREATE TABLE IF NOT EXISTS previously_asked_questions (
    question_id VARCHAR(12) PRIMARY KEY,
    company_name TEXT,
    company_role TEXT,
    download_url TEXT,
    total_downloads INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);

  // sponsorship_marquee
  await pool.query(`CREATE TABLE IF NOT EXISTS sponsorship_marquee (
    sponsor_id VARCHAR(12) PRIMARY KEY,
    image_url TEXT NOT NULL,
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);

  // success_stories
  await pool.query(`CREATE TABLE IF NOT EXISTS success_stories (
    review_id VARCHAR(6) PRIMARY KEY,
    reviewer_avatar TEXT,
    reviewer_name TEXT,
    reviewer_role TEXT,
    reviewer_company TEXT,
    reviewer_rating INTEGER,
    reviewer_review TEXT,
    reviewer_package TEXT,
    reviewer_city TEXT,
    verified_review BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);

  // courses
  await pool.query(`CREATE TABLE IF NOT EXISTS courses (
    course_id VARCHAR(7) PRIMARY KEY,
    course_type TEXT,
    banner_image_url TEXT,
    course_name TEXT,
    languages JSONB,
    duration TEXT,
    course_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  // Ensure languages column is JSONB (migrate if previously TEXT)
  await pool.query(`DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='courses' AND column_name='languages' AND data_type='text'
    ) THEN
      BEGIN
        ALTER TABLE courses ALTER COLUMN languages TYPE JSONB USING 
          CASE 
            WHEN languages IS NULL OR trim(languages)='' THEN '[]'::jsonb
            WHEN languages LIKE '[' || '%' THEN languages::jsonb
            ELSE '[]'::jsonb
          END;
      EXCEPTION WHEN others THEN
        RAISE NOTICE 'Could not convert existing languages values to JSONB; setting to empty array';
        ALTER TABLE courses ALTER COLUMN languages TYPE JSONB USING '[]'::jsonb;
      END;
    END IF;
  END $$;`);

  // interview_preperation_kit
  await pool.query(`CREATE TABLE IF NOT EXISTS interview_preperation_kit (
    kit_id VARCHAR(7) PRIMARY KEY,
    kit_type TEXT,
    kit_name TEXT,
    kit_description TEXT,
    kit_banner_image_url TEXT,
    kit_skills TEXT,
    kit_url TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_interviewkit_published ON interview_preperation_kit (published);`);

  // project_ideas
  await pool.query(`CREATE TABLE IF NOT EXISTS project_ideas (
    project_id VARCHAR(13) PRIMARY KEY,
    project_name TEXT,
    project_launch_authority TEXT,
    rating NUMERIC,
    total_reviews INTEGER,
    download_url TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_projectideas_published ON project_ideas (published);`);
  await pool.query(`ALTER TABLE project_ideas ADD COLUMN IF NOT EXISTS banner_image_url TEXT;`);
  // Remove deprecated pricing columns if they still exist
  await pool.query(`ALTER TABLE project_ideas DROP COLUMN IF EXISTS actual_price;`);
  await pool.query(`ALTER TABLE project_ideas DROP COLUMN IF EXISTS discounted_price;`);

  // learning_resources
  await pool.query(`CREATE TABLE IF NOT EXISTS learning_resources (
    resource_id VARCHAR(13) PRIMARY KEY,
    resource_name TEXT,
    resource_launch_authority TEXT,
    rating NUMERIC,
    total_reviews INTEGER,
    download_url TEXT,
    banner_image_url TEXT,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_learningresources_published ON learning_resources (published);`);

  // events
  await pool.query(`CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(12) PRIMARY KEY,
    event_banner_image_url TEXT,
    event_name TEXT,
    event_date DATE,
    event_short_description TEXT,
    event_registration_start DATE,
    event_registration_end DATE,
    event_url TEXT,
    close_registration BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_events_published ON events (published);`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_url TEXT;`);

  // hackathons
  await pool.query(`CREATE TABLE IF NOT EXISTS hackathons (
    hackathon_id VARCHAR(12) PRIMARY KEY,
    hackathon_name TEXT,
    hackathon_banner_image_url TEXT,
    hackathon_short_description TEXT,
    hackathon_date DATE,
    hackathon_registration_start DATE,
    hackathon_registration_end DATE,
    hackathon_url TEXT,
    close_registration BOOLEAN DEFAULT false,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_hackathons_published ON hackathons (published);`);
  await pool.query(`ALTER TABLE hackathons ADD COLUMN IF NOT EXISTS hackathon_url TEXT;`);

  // blogs
  await pool.query(`CREATE TABLE IF NOT EXISTS blogs (
    blog_id VARCHAR(10) PRIMARY KEY,
    blog_title TEXT,
    blog_banner_url TEXT,
    blog_story TEXT,
    published_blog BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_blogs_published ON blogs (published_blog);`);

  // reset_password_log
  await pool.query(`CREATE TABLE IF NOT EXISTS reset_password_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    otp VARCHAR(8) NOT NULL,
    reset_password BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_password_email ON reset_password_log (email);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_password_otp ON reset_password_log (otp);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_reset_password_expires ON reset_password_log (expires_at);`);

  // payments
  await pool.query(`CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type TEXT, -- service payment, premium payment, etc.
    plan_type TEXT, -- e.g., resumereview, booster, etc.
    razorpay_payment_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    razorpay_signature TEXT,
    verified BOOLEAN DEFAULT false,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_verified ON payments (verified);`);

  // service_verifications (stores user submissions for services with verified payments)
  await pool.query(`CREATE TABLE IF NOT EXISTS service_verifications (
    service_id VARCHAR(12) PRIMARY KEY,
    user_id VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone_number TEXT,
    state TEXT,
    language TEXT,
    resume_url TEXT,
    service_needed TEXT,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    razorpay_signature TEXT,
    payment_verified BOOLEAN DEFAULT false,
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_verifications_user ON service_verifications (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_service_verifications_payment ON service_verifications (payment_verified);`);

  // user_resources: which users have lifetime access to which resources
  await pool.query(`CREATE TABLE IF NOT EXISTS user_resources (
    user_id VARCHAR(10) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    resource_id VARCHAR(12) NOT NULL REFERENCES resources(resource_id) ON DELETE CASCADE,
    signed_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, resource_id)
  );`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_resources_user ON user_resources (user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_resources_resource ON user_resources (resource_id);`);

  // saved_jobs: one row per user, array of job ids
  await pool.query(`CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id VARCHAR(10) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    job_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );`);
}

module.exports = { pool, init };
