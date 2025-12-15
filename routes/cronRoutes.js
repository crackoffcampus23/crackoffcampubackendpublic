const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { alertUser, endUser } = require('../controllers/cronController');

const router = express.Router();

// Secured cron-style routes; trigger via scheduler or admin
router.post('/alertuser', auth, requireAdmin, alertUser);
router.post('/endUser', auth, requireAdmin, endUser);

module.exports = router;
