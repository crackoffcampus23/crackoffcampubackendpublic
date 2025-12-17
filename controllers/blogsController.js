const model = require('../models/blogsModel');

function sanitize(row) {
  if (!row) return null;
  return {
    blogId: row.blog_id,
    blogTitle: row.blog_title,
    blogBannerUrl: row.blog_banner_url,
    blogStory: row.blog_story,
    publishedBlog: row.published_blog,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function add(req, res) {
  try {
    const created = await model.create(req.body || {});
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('blogs.add error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAll(req, res) {
  try {
    const rows = await model.listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('blogs.getAll error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPublic(req, res) {
  try {
    const rows = await model.listPublic();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('blogs.getPublic error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteOne(req, res) {
  try {
    const { blogid } = req.params;
    if (!blogid) return res.status(400).json({ error: 'blogid param is required' });
    const ok = await model.deleteById(blogid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('blogs.deleteOne error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function edit(req, res) {
  try {
    const { blogid } = req.params;
    if (!blogid) return res.status(400).json({ error: 'blogid param is required' });
    const patch = req.body || {};
    const updated = await model.updateById(blogid, patch);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json({ item: sanitize(updated) });
  } catch (e) {
    console.error('blogs.edit error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { add, getAll, getPublic, deleteOne, edit };