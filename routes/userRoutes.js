const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { getAllUsers, getUserById, removeUser } = require('../controllers/userController');

const router = express.Router();

router.get('/allUsers', auth, requireAdmin, getAllUsers);
router.get('/user/:userid', auth, getUserById);
router.delete('/user/:userid/delete', auth, requireAdmin, removeUser);

module.exports = router;
