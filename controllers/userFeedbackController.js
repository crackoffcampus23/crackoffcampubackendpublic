const { create, listAll, deleteById } = require('../models/userFeedbackModel');

function sanitize(row) {
  if (!row) return null;
  return {
    feedbackId: row.feedback_id,
    name: row.name,
    phonenumber: row.phone_number,
    proofUrl: row.proof_url,
    feedbackType: row.feedback_type,
    message: row.message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function submitFeedback(req, res) {
  try {
    const { name, phonenumber, proofUrl, feedbackType, message } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const created = await create({ name, phonenumber, proofUrl, feedbackType, message });
    return res.status(201).json({ item: sanitize(created) });
  } catch (e) {
    console.error('userFeedback.submitFeedback error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getAllFeedback(req, res) {
  try {
    const rows = await listAll();
    return res.json({ items: rows.map(sanitize) });
  } catch (e) {
    console.error('userFeedback.getAllFeedback error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteFeedback(req, res) {
  try {
    const { feedbackid } = req.params;
    if (!feedbackid) return res.status(400).json({ error: 'feedbackid param is required' });
    const ok = await deleteById(feedbackid);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('userFeedback.deleteFeedback error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { submitFeedback, getAllFeedback, deleteFeedback };
