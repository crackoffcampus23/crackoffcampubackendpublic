const { pool } = require('../utils/db');
const { generateId } = require('../utils/idGenerator');

const table = 'notifications';

// Create the notifications table if it doesn't exist
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      notification_id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(24),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      reference_id VARCHAR(24),
      read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  // Create index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON ${table}(user_id)
  `);
  
  // Index for global notifications (user_id is null)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_global ON ${table}(user_id) WHERE user_id IS NULL
  `);
}

// Create a notification for a specific user or all users (user_id = null for global)
async function create(notification) {
  const notification_id = generateId(12);
  const { rows } = await pool.query(
    `INSERT INTO ${table} (
      notification_id, user_id, type, title, message, reference_id, read
    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      notification_id,
      notification.userId || null, // null means global notification for all users
      notification.type,
      notification.title,
      notification.message || null,
      notification.referenceId || null,
      false
    ]
  );
  return rows[0];
}

// Create global notification (for all users)
async function createGlobal(notification) {
  return create({ ...notification, userId: null });
}

// Get notifications for a user (includes global notifications they haven't dismissed)
async function getForUser(userId, limit = 50) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} 
     WHERE (user_id = $1 OR user_id IS NULL)
     AND notification_id NOT IN (
       SELECT notification_id FROM user_dismissed_notifications WHERE user_id = $1
     )
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

// Get unread count for a user
async function getUnreadCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM ${table} 
     WHERE (user_id = $1 OR user_id IS NULL)
     AND notification_id NOT IN (
       SELECT notification_id FROM user_dismissed_notifications WHERE user_id = $1
     )`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
}

// Mark a notification as read/dismissed for a user
async function markAsRead(notificationId, userId) {
  // For global notifications, we insert into a separate table to track dismissals per user
  // For user-specific notifications, we can just delete them
  
  const { rows } = await pool.query(
    `SELECT user_id FROM ${table} WHERE notification_id = $1`,
    [notificationId]
  );
  
  if (rows.length === 0) return null;
  
  const notification = rows[0];
  
  if (notification.user_id === null) {
    // Global notification - track dismissal in separate table
    await pool.query(
      `INSERT INTO user_dismissed_notifications (user_id, notification_id) 
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, notificationId]
    );
  } else {
    // User-specific notification - delete it
    await pool.query(
      `DELETE FROM ${table} WHERE notification_id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }
  
  return { success: true };
}

// Mark all notifications as read for a user
async function markAllAsRead(userId) {
  // Get all global notification IDs for this user
  const { rows: globalNotifs } = await pool.query(
    `SELECT notification_id FROM ${table} 
     WHERE user_id IS NULL 
     AND notification_id NOT IN (
       SELECT notification_id FROM user_dismissed_notifications WHERE user_id = $1
     )`,
    [userId]
  );
  
  // Insert dismissals for global notifications
  for (const notif of globalNotifs) {
    await pool.query(
      `INSERT INTO user_dismissed_notifications (user_id, notification_id) 
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, notif.notification_id]
    );
  }
  
  // Delete user-specific notifications
  await pool.query(
    `DELETE FROM ${table} WHERE user_id = $1`,
    [userId]
  );
  
  return { success: true };
}

// Delete old notifications (cleanup job)
async function deleteOldNotifications(daysOld = 30) {
  await pool.query(
    `DELETE FROM ${table} WHERE created_at < NOW() - INTERVAL '${daysOld} days'`
  );
  
  // Also clean up old dismissals
  await pool.query(
    `DELETE FROM user_dismissed_notifications 
     WHERE notification_id NOT IN (SELECT notification_id FROM ${table})`
  );
}

// Get a single notification
async function get(notificationId) {
  const { rows } = await pool.query(
    `SELECT * FROM ${table} WHERE notification_id = $1`,
    [notificationId]
  );
  return rows[0] || null;
}

// Ensure the dismissals table exists
async function ensureDismissalsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_dismissed_notifications (
      user_id VARCHAR(24) NOT NULL,
      notification_id VARCHAR(24) NOT NULL,
      dismissed_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, notification_id)
    )
  `);
}

// Initialize tables
async function init() {
  await ensureTable();
  await ensureDismissalsTable();
}

module.exports = {
  init,
  create,
  createGlobal,
  getForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteOldNotifications,
  get
};
