const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const ctrl = require('../controllers/coursesController');

const router = express.Router();

// Create a course (admin only)
router.post('/courses', auth, requireAdmin, ctrl.add);

// Public list of courses
router.get('/getcourses', ctrl.getAll);

// Delete a course (admin only)
router.delete('/course/:courseid', auth, requireAdmin, ctrl.deleteOne);

// Edit a course (admin only; partial update)
router.put('/course/:courseid', auth, requireAdmin, ctrl.edit);

module.exports = router;
