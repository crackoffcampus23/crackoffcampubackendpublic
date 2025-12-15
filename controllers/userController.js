const { listUsers, findById, deleteUser } = require('../models/userModel');

function sanitize(u) {
  return {
    userId: u.user_id,
    email: u.email,
    fullName: u.full_name,
    phoneNumber: u.phone_number,
    createdAt: u.created_at,
    updatedAt: u.updated_at
  };
}

async function getAllUsers(req, res) {
  try {
    const users = await listUsers();
    res.json({ users: users.map(sanitize) });
  } catch (e) {
    console.error('getAllUsers error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getUserById(req, res) {
  try {
    const { userid } = req.params;
    if (!userid) return res.status(400).json({ error: 'userid param required' });
    const user = await findById(userid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitize(user) });
  } catch (e) {
    console.error('getUserById error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAllUsers, getUserById };
async function removeUser(req, res) {
  try {
    const { userid } = req.params;
    if (!userid) return res.status(400).json({ error: 'userid param required' });
    const existing = await findById(userid);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    await deleteUser(userid);
    res.json({ success: true });
  } catch (e) {
    console.error('removeUser error', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAllUsers, getUserById, removeUser };
