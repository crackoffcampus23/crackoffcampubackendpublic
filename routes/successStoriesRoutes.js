const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/successStoriesController');

const router = express.Router();

// Create a success story (admin only)
router.post('/successstories', auth, requireAdmin, ctrl.add);

// Public list of success stories
router.get('/getsuccessstories', ctrl.getAll);

// Delete a specific success story (admin only)
router.delete('/successstories/:reviewid', auth, requireAdmin, ctrl.deleteOne);

// Edit a specific success story (admin only; partial update)
router.put('/successstoriesedit/:reviewid', auth, requireAdmin, ctrl.edit);

module.exports = router;
