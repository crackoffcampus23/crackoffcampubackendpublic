const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/hackathonsController');

// Create hackathon (admin only)
router.post('/hackathon', auth, requireAdmin, ctrl.add);

// List all hackathons (admin only)
router.get('/gethackathon', auth, requireAdmin, ctrl.getAll);

// Public hackathons (published only)
router.get('/hackathon/public', ctrl.getPublic);

// Edit hackathon (admin only)
router.put('/hackathon/:hackathonid', auth, requireAdmin, ctrl.edit);

// Delete hackathon (admin only)
router.delete('/hackathon/:hackathonid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;