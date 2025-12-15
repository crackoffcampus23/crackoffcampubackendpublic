const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Lazy load controller to avoid circular dependency
let notificationController = null;
function getController() {
  if (!notificationController) {
    notificationController = require('../controllers/notificationController');
  }
  return notificationController;
}

// Initialize tables (admin only)
router.post('/init', auth, requireAdmin, (req, res) => getController().initTables(req, res));

// Get notifications for a user
router.get('/user/:userId', auth, (req, res) => getController().getNotifications(req, res));

// Get unread count for a user
router.get('/user/:userId/unread-count', auth, (req, res) => getController().getUnreadCount(req, res));

// Mark a notification as read
router.patch('/:notificationId/read', auth, (req, res) => getController().markAsRead(req, res));

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', auth, (req, res) => getController().markAllAsRead(req, res));

// Create a notification (admin only)
router.post('/', auth, requireAdmin, (req, res) => getController().createNotification(req, res));

// Create a global notification (admin only)
router.post('/global', auth, requireAdmin, (req, res) => getController().createGlobalNotification(req, res));

module.exports = router;
