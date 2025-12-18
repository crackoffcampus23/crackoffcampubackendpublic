const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin, requireAdminOrSelf } = require('../middleware/roles');
const { getAllUsers, getUserById, removeUser } = require('../controllers/userController');

const router = express.Router();

router.get('/allUsers', auth, requireAdmin, getAllUsers);
router.get('/user/:userid', auth, getUserById);
// Allow admin to delete any user, or a normal user to delete their own account
router.delete('/user/:userid/delete', auth, requireAdminOrSelf('userid'), removeUser);

module.exports = router;
