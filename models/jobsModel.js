const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'jobs';

async function create(job) {
  if (!job.type) throw new Error('type is required (job or internship)');
  const job_id = job.jobId || generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      job_id, type, job_type, job_role, company_giving, last_date_to_apply, location, who_can_apply,
      redirect_link, user_clicked_apply_now, recruiter_email, employee_email, referral_form_link,
  hiring_form, description, stipend, ppo, ppo_offer, published, career_portal_link, duration, experience
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    ) RETURNING *`,
    [
      job_id,
      job.type,
      job.jobType,
      job.jobRole,
      job.companyGiving,
      job.lastDateToApply,
      job.location,
      job.whoCanApply,
      job.redirectLink,
      job.userClickedApplyNow || 0,
      job.recruiterEmail || null,
      job.employeeEmail || null,
      job.refferalFormLink || job.referralFormLink || null,
      job.HiringForm || job.hiringForm || null,
      job.description || null,
      job.stipend || null,
      job.PPO === true || job.ppo === true || false,
      job.PPOOffer || job.ppoOffer || null,
      job.published === true,
      job.careerPortalLink || null,
      job.duration || null,
      job.experience || null
    ]
  );
  return rows[0];
}

async function listAll() { const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`); return rows; }
async function listPublishedOnly() { const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published=true ORDER BY created_at DESC`); return rows; }

async function get(id) {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE job_id=$1`, [id]);
  return rows[0] || null;
}

async function update(id, payload) {
  const mapping = {
    type: 'type',
    jobType: 'job_type',
    jobRole: 'job_role',
    companyGiving: 'company_giving',
    lastDateToApply: 'last_date_to_apply',
    location: 'location',
    whoCanApply: 'who_can_apply',
    redirectLink: 'redirect_link',
    userClickedApplyNow: 'user_clicked_apply_now',
    recruiterEmail: 'recruiter_email',
    employeeEmail: 'employee_email',
    refferalFormLink: 'referral_form_link',
    referralFormLink: 'referral_form_link',
    HiringForm: 'hiring_form',
    hiringForm: 'hiring_form',
    description: 'description',
    stipend: 'stipend',
    PPO: 'ppo',
    ppo: 'ppo',
  PPOOffer: 'ppo_offer',
  ppoOffer: 'ppo_offer',
      published: 'published',
      careerPortalLink: 'career_portal_link',
      duration: 'duration',
      experience: 'experience'
  };
  const fields = []; const values = []; let i = 1;
  for (const k of Object.keys(mapping)) {
    if (payload[k] !== undefined) {
      fields.push(`${mapping[k]}=$${i++}`);
      // boolean casting for ppo
      if (k === 'PPO' || k === 'ppo') {
        values.push(payload[k] === true);
      } else if (k === 'PPOOffer' || k === 'ppoOffer') {
        values.push(payload[k]); // string value (annual salary / offer detail)
      } else {
        values.push(payload[k]);
      }
    }
  }
  if (!fields.length) return get(id);
  values.push(id);
  const { rows } = await pool.query(`UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE job_id=$${i} RETURNING *`, values);
  return rows[0] || null;
}

async function remove(id) {
  await pool.query(`DELETE FROM ${table} WHERE job_id=$1`, [id]);
}

// Provide a generic list() for factory getAll(), and expose specific list helpers as well
async function list() { return listAll(); }

module.exports = { create, list, listAll, listPublishedOnly, get, update, remove };
