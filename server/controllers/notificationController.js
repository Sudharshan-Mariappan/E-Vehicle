const { query } = require('../config/db');

/**
 * GET /api/notifications
 * Get all notifications for the current user.
 */
const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await query(
            `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
            [userId]
        );
        res.json({ success: true, notifications: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a specific notification as read.
 */
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await query(
            `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for the current user.
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await query(
            `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
            [userId]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification.
 */
const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await query(
            `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
            [id, userId]
        );
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/notifications/clear-all
 * Delete all notifications for the current user.
 */
const clearAllNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await query(`DELETE FROM notifications WHERE user_id = $1`, [userId]);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications };
