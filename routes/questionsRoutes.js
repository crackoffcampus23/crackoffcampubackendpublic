const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/questionsController');

const router = express.Router();

router.post('/question', auth, ctrl.add);
router.get('/questions', auth, ctrl.getAll);
router.get('/question/:questionid', auth, ctrl.getOne);
router.put('/question/:questionid/edit', auth, ctrl.update);
router.delete('/question/:questionid/delete', auth, ctrl.remove);

module.exports = router;
