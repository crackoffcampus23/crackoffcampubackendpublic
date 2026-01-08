const notificationModel = require('../models/notificationModel');

// Initialize the notifications tables
async function initTables(req, res) {
  try {
    await notificationModel.init();
    res.json({ success: true, message: 'Notification tables initialized' });
  } catch (error) {
    console.error('Error initializing notification tables:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get notifications for the authenticated user
async function getNotifications(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const notifications = await notificationModel.getForUser(userId, limit);
    
    // Transform to camelCase for frontend
    const items = notifications.map(transformNotification);
    
    res.json({ items, count: items.length });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
}

// Get unread notification count
async function getUnreadCount(req, res) {
  try {
    const userId = req.params.userId || req.user?.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const count = await notificationModel.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
}

// Mark a notification as read
async function markAsRead(req, res) {
  try {
    const { notificationId } = req.params;
    const userId = req.body.userId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const result = await notificationModel.markAsRead(notificationId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
}

// Mark all notifications as read
async function markAllAsRead(req, res) {
  try {
    const userId = req.params.userId || req.body.userId || req.user?.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await notificationModel.markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create a notification (admin only or internal use)
async function createNotification(req, res) {
  try {
    const { userId, type, title, message, referenceId } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }
    
    const notification = await notificationModel.create({
      userId, // null for global
      type,
      title,
      message,
      referenceId
    });
    
    res.status(201).json({ item: transformNotification(notification) });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: error.message });
  }
}

// Create a global notification (for all users)
async function createGlobalNotification(req, res) {
  try {
    const { type, title, message, referenceId } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ error: 'Type and title are required' });
    }
    
    const notification = await notificationModel.createGlobal({
      type,
      title,
      message,
      referenceId
    });
    
    res.status(201).json({ item: transformNotification(notification) });
  } catch (error) {
    console.error('Error creating global notification:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper function to create notification internally (not via API)
async function createNotificationInternal({ userId, type, title, message, referenceId }) {
  try {
    if (userId) {
      return await notificationModel.create({ userId, type, title, message, referenceId });
    } else {
      return await notificationModel.createGlobal({ type, title, message, referenceId });
    }
  } catch (error) {
    console.error('Error creating notification internally:', error);
    return null;
  }
}

// Transform database row to camelCase
function transformNotification(row) {
  if (!row) return null;
  return {
    notificationId: row.notification_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    referenceId: row.reference_id,
    // include raw meta payload (jobs use this to pass job details)
    meta: row.meta || null,
    // for convenience expose common job-related fields at top-level
    experience: row.meta && row.meta.experience ? row.meta.experience : null,
    location: row.meta && row.meta.location ? row.meta.location : null,
    read: row.read,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  initTables,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  createGlobalNotification,
  createNotificationInternal
};
