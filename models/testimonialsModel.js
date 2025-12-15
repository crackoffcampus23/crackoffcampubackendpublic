const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'testimonials';

async function create(item) {
  const video_story_id = generateId(6);
  const testimonial_id = generateId(12);
  const {
    studentName = null,
    studentRole = null,
    salary = null,
    company = null,
    companyLogo = null,
    imageUrl = null,
    videoUrl = null,
    description = null,
  } = item || {};

  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      testimonial_id, video_story_id, student_name, student_role, salary, company, company_logo, image_url, video_url, description
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [testimonial_id, video_story_id, studentName, studentRole, salary, company, companyLogo, imageUrl, videoUrl, description]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function getByVideoStoryId(id) {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE video_story_id=$1`, [id]);
  return rows[0] || null;
}

async function updateByVideoStoryId(id, payload) {
  const mapping = {
    studentName: 'student_name',
    studentRole: 'student_role',
    salary: 'salary',
    company: 'company',
    companyLogo: 'company_logo',
    imageUrl: 'image_url',
    videoUrl: 'video_url',
    description: 'description',
  };
  const fields = []; const values = []; let i = 1;
  for (const k of Object.keys(mapping)) if (payload[k] !== undefined) { fields.push(`${mapping[k]}=$${i++}`); values.push(payload[k]); }
  if (!fields.length) return getByVideoStoryId(id);
  values.push(id);
  const { rows } = await pool.query(`UPDATE ${table} SET ${fields.join(', ')}, updated_at=now() WHERE video_story_id=$${i} RETURNING *`, values);
  return rows[0] || null;
}

async function deleteByVideoStoryId(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE video_story_id=$1`, [id]);
  return result.rowCount > 0;
}

module.exports = { create, listAll, getByVideoStoryId, updateByVideoStoryId, deleteByVideoStoryId };
