const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/adBannerController');

// Create/replace single-row ad banner config
router.post('/appadbanner', auth, requireAdmin, ctrl.create);

// Get public ad banner status
router.get('/adbanner', ctrl.get);

// Update partial fields
router.put('/appupdate', auth, requireAdmin, ctrl.update);

// Optional: reset to defaults
router.delete('/appadbanner', auth, requireAdmin, ctrl.reset);

module.exports = router;