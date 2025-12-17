const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/blogsController');

// Create blog (admin only)
router.post('/blogs', auth, requireAdmin, ctrl.add);

// List all blogs (admin only)
router.get('/blogs', auth, requireAdmin, ctrl.getAll);

// Public list (published only)
router.get('/blogs/public', ctrl.getPublic);

// Edit blog (admin only)
router.put('/blog/:blogid', auth, requireAdmin, ctrl.edit);

// Delete blog (admin only)
router.delete('/blog/:blogid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;