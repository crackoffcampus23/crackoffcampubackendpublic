const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/learningResourcesController');

// Create learning resource (admin only)
router.post('/learningresources', auth, requireAdmin, ctrl.add);

// List all learning resources (admin only)
router.get('/learningresources', auth, requireAdmin, ctrl.getAll);

// Public list (published only)
router.get('/learningresources/public', ctrl.getPublic);

// Edit learning resource (admin only)
router.put('/editlearning/:resourceid', auth, requireAdmin, ctrl.edit);

// Delete learning resource (admin only)
router.delete('/learningresources/:resourceid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;