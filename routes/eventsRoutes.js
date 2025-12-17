const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/eventsController');

// Create event (admin only)
router.post('/events', auth, requireAdmin, ctrl.add);

// List all events (admin only)
router.get('/getevents', auth, requireAdmin, ctrl.getAll);

// Public events (published only)
router.get('/events/public', ctrl.getPublic);

// Edit event (admin only)
router.put('/events/:eventid', auth, requireAdmin, ctrl.edit);

// Delete event (admin only)
router.delete('/events/:eventid', auth, requireAdmin, ctrl.deleteOne);

module.exports = router;