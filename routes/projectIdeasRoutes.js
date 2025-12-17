const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/projectIdeasController');

const router = express.Router();

// Create project idea (admin only)
router.post('/projectideas', auth, requireAdmin, ctrl.add);

// List all project ideas (admin only)
router.get('/projectideas', auth, requireAdmin, ctrl.getAll);

// Public list (published only)
router.get('/projectideas/public', ctrl.getPublic);

// Edit project idea (admin only)
router.put('/editproject/:projectid', auth, requireAdmin, ctrl.edit);

// Delete project idea (admin only)
router.delete('/projectideas/:projectid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;
