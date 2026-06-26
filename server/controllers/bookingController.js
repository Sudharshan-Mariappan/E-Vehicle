const { createBooking, completeBooking, cancelBooking } = require('../services/bookingService');
const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { emitAvailabilityUpdate } = require('../services/socketService');


/**
 * POST /api/bookings
 * Creates a new booking using a PostgreSQL transaction to prevent double-booking.
 * If the slot is already occupied, returns a 409 error with a suggestion to join the queue.
 */
const createBookingHandler = async (req, res, next) => {
    try {
        const { stationId, slotId } = req.body;
        const userId = req.user.id;

        // Pre-validate: ensure user exists in the database
        const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userCheck.rows.length === 0) {
            return next(new AppError('Your user account was not found. Please log out and register again.', 404));
        }

        // Pre-validate: ensure station exists
        const stationCheck = await query('SELECT id FROM stations WHERE id = $1', [stationId]);
        if (stationCheck.rows.length === 0) {
            return next(new AppError('Station not found. It may have been removed.', 404));
        }

        // Pre-validate: ensure slot exists and belongs to the station
        const slotCheck = await query('SELECT id, status FROM slots WHERE id = $1 AND station_id = $2', [slotId, stationId]);
        if (slotCheck.rows.length === 0) {
            return next(new AppError('Slot not found or does not belong to this station.', 404));
        }
        if (slotCheck.rows[0].status !== 'available') {
            return next(new AppError('This slot is no longer available. Please choose another slot or join the queue.', 409));
        }

        // Check if user already has an active booking
        const activeBooking = await query(
            `SELECT id FROM bookings WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        if (activeBooking.rows.length > 0) {
            return next(new AppError('You already have an active booking. Please complete or cancel it first.', 409));
        }

        // Delegate to booking service (handles transaction + race condition prevention)
        const io = req.app.get('io');
        const booking = await createBooking({ userId, stationId, slotId, io });

        // Emit real-time slot status update to all clients watching this station
        io.to(`station_${stationId}`).emit('slot_status_changed', {
            stationId,
            slotId,
            status: 'occupied',
            message: 'A slot has been booked',
        });

        // Also emit updated availability count
        await emitAvailabilityUpdate(stationId, io);

        res.status(201).json({
            success: true,
            message: 'Slot booked successfully!',
            booking,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/bookings/:id/complete
 * Marks a booking as completed, calculates cost, frees the slot,
 * and triggers queue auto-assignment if anyone is waiting.
 */
const completeBookingHandler = async (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id);
        const { energyConsumed } = req.body;
        const userId = req.user.id;

        const io = req.app.get('io');

        // Delegate to booking service (handles slot release + queue auto-assign)
        const result = await completeBooking({ bookingId, userId, energyConsumed, io });

        res.json({
            success: true,
            message: 'Charging session completed successfully',
            booking: result.booking,
            totalCost: result.totalCost,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/bookings/:id/cancel
 * Cancels an active booking and releases the slot.
 */
const cancelBookingHandler = async (req, res, next) => {
    try {
        const bookingId = parseInt(req.params.id);
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';
        const io = req.app.get('io');

        const result = await cancelBooking({ bookingId, userId, isAdmin, io });

        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking: result.booking,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/bookings/my
 * Returns the current user's booking history.
 */
const getMyBookings = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const result = await query(
            `SELECT b.*, s.name AS station_name, s.address, sl.slot_name, sl.connector_type
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       JOIN slots sl ON b.slot_id = sl.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
            [userId]
        );

        res.json({ success: true, bookings: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/bookings/all
 * (Admin only) Returns all bookings in the system.
 */
const getAllBookings = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT b.*, u.name as user_name, u.email as user_email, s.name AS station_name, sl.slot_name
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN stations s ON b.station_id = s.id
       JOIN slots sl ON b.slot_id = sl.id
       ORDER BY b.created_at DESC`
        );
        res.json({ success: true, bookings: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createBookingHandler,
    completeBookingHandler,
    cancelBookingHandler,
    getMyBookings,
    getAllBookings,
};
