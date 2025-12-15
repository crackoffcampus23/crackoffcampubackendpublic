const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'blogs';

function normalizeInput(data) {
  const d = data || {};
  return {
    blogTitle: d.blogTitle ?? d.BlogTitle ?? null,
    blogBannerUrl: d.blogBannerUrl ?? d.blogBannnerUrl ?? d.BlogBannerUrl ?? null,
    blogStory: d.blogStory ?? d.BlogStory ?? null,
    publishedBlog: typeof d.publishedBlog === 'boolean' ? d.publishedBlog : (d.publishedBlog === 'true' ? true : (d.publishedBlog === 'false' ? false : null)),
  };
}

async function create(data) {
  const blog_id = generateId(10);
  const n = normalizeInput(data);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      blog_id, blog_title, blog_banner_url, blog_story, published_blog
    ) VALUES ($1,$2,$3,$4,COALESCE($5,false)) RETURNING *`,
    [blog_id, n.blogTitle, n.blogBannerUrl, n.blogStory, n.publishedBlog]
  );
  return rows[0];
}

async function listAll() {
  const { rows } = await pool.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
  return rows;
}

async function listPublic() {
  const { rows } = await pool.query(`SELECT * FROM ${table} WHERE published_blog = true ORDER BY created_at DESC`);
  return rows;
}

async function deleteById(id) {
  const result = await pool.query(`DELETE FROM ${table} WHERE blog_id = $1`, [id]);
  return result.rowCount > 0;
}

async function updateById(id, patch) {
  const n = normalizeInput(patch);
  const mapping = {
    blogTitle: 'blog_title',
    blogBannerUrl: 'blog_banner_url',
    blogStory: 'blog_story',
    publishedBlog: 'published_blog',
  };
  const fields = [];
  const values = [];
  let i = 1;
  for (const k of Object.keys(mapping)) {
    if (Object.prototype.hasOwnProperty.call(n, k) && n[k] !== undefined) {
      fields.push(`${mapping[k]} = $${i++}`);
      values.push(n[k]);
    }
  }
  if (!fields.length) {
    const { rows } = await pool.query(`SELECT * FROM ${table} WHERE blog_id = $1`, [id]);
    return rows[0] || null;
  }
  values.push(id);
  const sql = `UPDATE ${table} SET ${fields.join(', ')}, updated_at = now() WHERE blog_id = $${i} RETURNING *`;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

module.exports = { create, listAll, listPublic, deleteById, updateById };