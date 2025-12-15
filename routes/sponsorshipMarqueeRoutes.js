const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/sponsorshipMarqueeController');

const router = express.Router();

// Create sponsorship marquee entry (admin only)
router.post('/sponsorshipMarquee', auth, requireAdmin, ctrl.add);

// Public fetch of sponsorship marquee entries
router.get('/getSponsorshipMarquee', ctrl.getAll);

// Delete a single sponsorship marquee entry (admin only)
router.delete('/sponsorshipMarquee/:id', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;
