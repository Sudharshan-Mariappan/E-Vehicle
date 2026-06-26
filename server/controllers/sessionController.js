const { query } = require('../config/db');

/**
 * GET /api/sessions/active
 * Returns the current user's active booking/session details.
 */
const getActiveSession = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT b.*, s.name AS station_name, s.address, s.price_per_kwh,
              sl.slot_name, sl.connector_type, sl.power_kw
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       JOIN slots sl ON b.slot_id = sl.id
       WHERE b.user_id = $1 AND b.status = 'active'
       ORDER BY b.created_at DESC
       LIMIT 1`,
            [req.user.id]
        );

        res.json({ success: true, activeSession: result.rows[0] || null });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/sessions/history
 * Returns the current user's completed session history.
 */
const getSessionHistory = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT b.*, s.name AS station_name, s.address,
              sl.slot_name, sl.connector_type
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       JOIN slots sl ON b.slot_id = sl.id
       WHERE b.user_id = $1 AND b.status IN ('completed', 'cancelled')
       ORDER BY b.created_at DESC`,
            [req.user.id]
        );

        res.json({ success: true, sessions: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { getActiveSession, getSessionHistory };
