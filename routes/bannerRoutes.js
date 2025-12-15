const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/bannerImagesController');

const router = express.Router();

// Create banner (admin only)
router.post('/banner', auth, requireAdmin, ctrl.add);

// Public list of banners
router.get('/banner/public', ctrl.getPublic);

// Delete banner by id (admin only)
router.delete('/banner/:bannerid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;
