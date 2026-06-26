const { query } = require('../config/db');
const { sendNotification } = require('./socketService');

/**
 * Helper to save notification to DB and send real-time socket notification
 */
const saveNotification = async ({ userId, type, message, io }) => {
    try {
        await query(
            `INSERT INTO notifications (user_id, type, message) VALUES ($1, $2, $3)`,
            [userId, type || 'info', message]
        );

        if (io) {
            sendNotification(io, userId, {
                type: type || 'info',
                message,
                created_at: new Date()
            });
        }
    } catch (err) {
        console.error('Failed to save notification:', err);
    }
};

/**
 * Notify a user that a slot has been assigned to them from the queue.
 */
const sendSlotAvailableNotification = async ({ userId, userName, userEmail, stationId, bookingId, io }) => {
    try {
        const message = `Good news, ${userName}! A slot has been assigned to you. Booking #${bookingId} is active.`;
        await saveNotification({ userId, type: 'success', message, io });
        console.log(`📱 [NOTIFICATION] Slot assigned to user ${userName} (${userEmail})`);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

/**
 * Notify a user of their current queue position update.
 */
const sendQueueUpdateNotification = async ({ userId, userName, stationId, position, io }) => {
    try {
        const message = `Queue Update: You are now at position #${position} for station #${stationId}.`;
        await saveNotification({ userId, type: 'info', message, io });
        console.log(`📱 [NOTIFICATION] Queue update for ${userName}: Position #${position}`);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const sendBookingConfirmation = async ({ userId, stationName, slotName, bookingId, io }) => {
    try {
        const message = `Booking confirmed at ${stationName} (${slotName}). Booking #${bookingId}.`;
        await saveNotification({ userId, type: 'success', message, io });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const sendSessionCompleteNotification = async ({ userId, stationName, totalCost, energy, io }) => {
    try {
        const message = `Charging complete at ${stationName}. Energy: ${energy} kWh, Cost: ₹${totalCost}.`;
        await saveNotification({ userId, type: 'success', message, io });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const sendBookingCancelledNotification = async ({ userId, stationName, io }) => {
    try {
        const message = `Your booking at ${stationName} has been cancelled.`;
        await saveNotification({ userId, type: 'warning', message, io });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

const sendSlotOfferedNotification = async ({ userId, stationName, slotName, io }) => {
    try {
        const message = `A slot (${slotName}) is now available for you at ${stationName}! You have 5 minutes to confirm.`;
        await saveNotification({ userId, type: 'info', message, io });
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
};

module.exports = {
    sendSlotAvailableNotification,
    sendQueueUpdateNotification,
    saveNotification,
    sendBookingConfirmation,
    sendSessionCompleteNotification,
    sendBookingCancelledNotification,
    sendSlotOfferedNotification
};
