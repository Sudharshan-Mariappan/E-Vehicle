const { getClient, query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { autoAssignFromQueue } = require('./queueService');
const { sendBookingConfirmation, sendSessionCompleteNotification, sendBookingCancelledNotification } = require('./notificationService');
const { emitAvailabilityUpdate } = require('./socketService');




/**
 * Creates a booking atomically using a PostgreSQL transaction.
 * Uses SELECT FOR UPDATE to lock the slot row and prevent race conditions.
 *
 * @param {Object} params - { userId, stationId, slotId }
 * @returns {Object} The created booking record
 */
const createBooking = async ({ userId, stationId, slotId, io }) => {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Lock the slot row to prevent concurrent bookings (SELECT FOR UPDATE)
        const slotResult = await client.query(
            `SELECT id, status, station_id FROM slots WHERE id = $1 FOR UPDATE`,
            [slotId]
        );

        if (slotResult.rows.length === 0) {
            throw new AppError('Slot not found.', 404);
        }

        const slot = slotResult.rows[0];

        // Verify slot belongs to the requested station
        if (slot.station_id !== stationId) {
            throw new AppError('Slot does not belong to this station.', 400);
        }

        // Check slot is still available (another request may have taken it)
        if (slot.status !== 'available') {
            throw new AppError(
                'This slot is no longer available. Please join the queue or choose another slot.',
                409
            );
        }

        // Mark slot as occupied
        await client.query(
            `UPDATE slots SET status = 'occupied' WHERE id = $1`,
            [slotId]
        );

        // Create the booking record
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, station_id, slot_id, status, start_time)
       VALUES ($1, $2, $3, 'active', NOW())
       RETURNING *`,
            [userId, stationId, slotId]
        );

        // Fetch station and slot names for notification
        const stationDetailsResult = await client.query(
            `SELECT s.name AS station_name, sl.slot_name 
             FROM stations s 
             JOIN slots sl ON s.id = sl.station_id 
             WHERE s.id = $1 AND sl.id = $2`,
            [stationId, slotId]
        );

        await client.query('COMMIT');

        const booking = bookingResult.rows[0];

        if (stationDetailsResult.rows.length > 0) {
            const { station_name, slot_name } = stationDetailsResult.rows[0];
            await sendBookingConfirmation({
                userId,
                stationName: station_name,
                slotName: slot_name,
                bookingId: booking.id,
                io
            });
        }

        return booking;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Completes a booking:
 * 1. Calculates total cost based on energy consumed and station price
 * 2. Updates booking record (end_time, energy_consumed, total_cost, status)
 * 3. Frees the slot (status → 'available')
 * 4. Triggers queue auto-assignment if anyone is waiting
 *
 * @param {Object} params - { bookingId, userId, energyConsumed, io }
 * @returns {Object} { booking, totalCost }
 */
const completeBooking = async ({ bookingId, userId, energyConsumed, io }) => {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Fetch the booking (lock it)
        const bookingResult = await client.query(
            `SELECT b.*, s.price_per_kwh, s.name AS station_name
       FROM bookings b
       JOIN stations s ON b.station_id = s.id
       WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'active'
       FOR UPDATE`,
            [bookingId, userId]
        );

        if (bookingResult.rows.length === 0) {
            throw new AppError('Active booking not found or you are not authorized.', 404);
        }

        const booking = bookingResult.rows[0];
        const totalCost = parseFloat((energyConsumed * booking.price_per_kwh).toFixed(2));

        // Check if user has sufficient balance (Optional enforcement, here we just deduct)
        const userWallet = await client.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
        const currentBalance = parseFloat(userWallet.rows[0].wallet_balance);

        /* 
        // Optional: Enforce positive balance
        if (currentBalance < totalCost) {
            throw new AppError('Insufficient wallet balance', 402);
        }
        */

        // Deduct from wallet
        await client.query(
            'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
            [totalCost, userId]
        );

        // Record DEBIT transaction
        await client.query(
            `INSERT INTO transactions (user_id, amount, type, description)
             VALUES ($1, $2, 'DEBIT', $3)`,
            [userId, totalCost, `Payment for charging session #${bookingId}`]
        );

        // Update booking to completed
        const updatedBookingResult = await client.query(
            `UPDATE bookings
       SET status = 'completed', end_time = NOW(),
           energy_consumed = $1, total_cost = $2
       WHERE id = $3
       RETURNING *`,
            [energyConsumed, totalCost, bookingId]
        );

        // Free the slot
        await client.query(
            `UPDATE slots SET status = 'available' WHERE id = $1`,
            [booking.slot_id]
        );

        await client.query('COMMIT');

        // After committing, trigger queue auto-assignment (outside transaction)
        await autoAssignFromQueue({
            stationId: booking.station_id,
            slotId: booking.slot_id,
            io,
        });

        // Emit slot available event to all station watchers
        if (io) {
            io.to(`station_${booking.station_id}`).emit('slot_status_changed', {
                stationId: booking.station_id,
                slotId: booking.slot_id,
                status: 'available',
                message: 'A slot has become available',
            });
            // Emit full availability update (counts)
            await emitAvailabilityUpdate(booking.station_id, io);
        }

        await sendSessionCompleteNotification({
            userId,
            stationName: booking.station_name,
            totalCost,
            energy: energyConsumed,
            io
        });

        return {
            booking: updatedBookingResult.rows[0],
            totalCost,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Cancels an active booking and releases the slot.
 * Also triggers queue auto-assignment.
 *
 * @param {Object} params - { bookingId, userId, io }
 * @returns {Object} { booking }
 */
const cancelBooking = async ({ bookingId, userId, isAdmin, io }) => {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Fetch and lock the booking
        let bookingResult;
        if (isAdmin) {
            bookingResult = await client.query(
                `SELECT b.*, s.name AS station_name FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = $1 AND b.status = 'active' FOR UPDATE`,
                [bookingId]
            );
        } else {
            bookingResult = await client.query(
                `SELECT b.*, s.name AS station_name FROM bookings b JOIN stations s ON b.station_id = s.id WHERE b.id = $1 AND b.user_id = $2 AND b.status = 'active' FOR UPDATE`,
                [bookingId, userId]
            );
        }

        if (bookingResult.rows.length === 0) {
            throw new AppError('Active booking not found or unauthorized.', 404);
        }

        const booking = bookingResult.rows[0];

        // Update booking to cancelled
        const updatedResult = await client.query(
            `UPDATE bookings SET status = 'cancelled', end_time = NOW() WHERE id = $1 RETURNING *`,
            [bookingId]
        );

        // Free the slot
        await client.query(
            `UPDATE slots SET status = 'available' WHERE id = $1`,
            [booking.slot_id]
        );

        await client.query('COMMIT');

        // Trigger queue auto-assignment after releasing slot
        await autoAssignFromQueue({
            stationId: booking.station_id,
            slotId: booking.slot_id,
            io,
        });

        if (io) {
            io.to(`station_${booking.station_id}`).emit('slot_status_changed', {
                stationId: booking.station_id,
                slotId: booking.slot_id,
                status: 'available',
                message: 'A slot has become available',
            });
            // Emit full availability update (counts)
            await emitAvailabilityUpdate(booking.station_id, io);
        }

        await sendBookingCancelledNotification({
            userId: booking.user_id, // Notify the booking owner
            stationName: booking.station_name,
            io
        });

        return { booking: updatedResult.rows[0] };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = { createBooking, completeBooking, cancelBooking };
