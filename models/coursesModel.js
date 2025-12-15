const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'courses';

function normalizeLanguages(input) {
  if (!input) return [];
  // Accept: array of objects { languageName, languageIconUrl } OR
  // object map { name: iconUrl, ... }
  if (Array.isArray(input)) {
    return input
      .filter(o => o && typeof o === 'object')
      .map(o => ({
        languageName: o.languageName ?? o.name ?? null,
        languageIconUrl: o.languageIconUrl ?? o.icon ?? o.languageIcon ?? null,
      }))
      .filter(o => o.languageName && o.languageIconUrl);
  }
  if (typeof input === 'object') {
    return Object.entries(input)
      .map(([k, v]) => ({ languageName: k, languageIconUrl: v }))
      .filter(o => o.languageName && o.languageIconUrl);
  }
  if (typeof input === 'string') {
    // Try parse JSON string
    try {
      const parsed = JSON.parse(input);
      return normalizeLanguages(parsed);
    } catch (_) {
      // Comma-separated list without icons => return names with null icons (will be filtered out)
      return input.split(',').map(s => s.trim()).filter(Boolean).map(n => ({ languageName: n, languageIconUrl: '' })).filter(o => o.languageIconUrl);
    }
  }
  return [];
}

async function create(data) {
  const course_id = generateId(7);
  const {
    courseType = null,
    bannerImageUrl = null,
    courseName = null,
    languages = null,
    duration = null,
    courseUrl = null,
  } = data || {};

  const languagesJson = normalizeLanguages(languages);

  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      course_id, course_type, banner_image_url, course_name, languages, duration, course_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [course_id, courseType, bannerImageUrl, courseName, JSON.stringify(languagesJson), duration, courseUrl]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE course_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const mapping = {
    courseType: 'course_type',
    bannerImageUrl: 'banner_image_url',
    courseName: 'course_name',
    languages: 'languages',
    duration: 'duration',
    courseUrl: 'course_url',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      let val = patch[k];
      if (k === 'languages') {
        val = JSON.stringify(normalizeLanguages(val));
      }
      fields.push(`${mapping[k]} = $${i++}`);
      values.push(val);
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE course_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE course_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, deleteById, updateById };
