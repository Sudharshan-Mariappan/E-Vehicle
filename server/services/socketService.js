const { query } = require('../config/db');

/**
 * Helper to emit real-time availability updates for a station
 */
const emitAvailabilityUpdate = async (stationId, io) => {
    if (!io) return;
    try {
        const availabilityResult = await query(
            `SELECT COUNT(*) FILTER (WHERE status = 'available') AS available_slots,
              COUNT(*) AS total_slots
       FROM slots WHERE station_id = $1`,
            [stationId]
        );
        io.to(`station_${stationId}`).emit('availability_updated', {
            stationId,
            ...availabilityResult.rows[0],
        });
    } catch (err) {
        console.error('Failed to emit availability update:', err);
    }
};

/**
 * Helper to send a real-time notification to a specific user
 */
const sendNotification = (io, userId, payload) => {
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit('notification_received', payload);
};

module.exports = { emitAvailabilityUpdate, sendNotification };
