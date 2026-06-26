const { query, getClient } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * POST /api/queue/accept-offer
 * Accepts a slot offer and creates a booking.
 */
const acceptOffer = async (req, res, next) => {
    const client = await getClient();
    try {
        const { queueId } = req.body;
        const userId = req.user.id;

        await client.query('BEGIN');

        // Find the queue entry
        const queueResult = await client.query(
            `SELECT * FROM queue WHERE id = $1 AND user_id = $2 AND status = 'offered' FOR UPDATE`,
            [queueId, userId]
        );

        if (queueResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(new AppError('Offer not found, expired, or you are not authorized', 404));
        }

        const queueEntry = queueResult.rows[0];

        // Check if expired
        if (new Date() > new Date(queueEntry.offer_expires_at)) {
            await client.query('ROLLBACK');
            return next(new AppError('Offer has expired', 400));
        }

        // Create booking
        const bookingResult = await client.query(
            `INSERT INTO bookings (user_id, station_id, slot_id, status, start_time)
       VALUES ($1, $2, $3, 'active', NOW())
       RETURNING *`,
            [userId, queueEntry.station_id, queueEntry.assigned_slot_id]
        );
        const newBooking = bookingResult.rows[0];

        // Mark slot occupied
        await client.query(`UPDATE slots SET status = 'occupied' WHERE id = $1`, [queueEntry.assigned_slot_id]);

        // Update queue entry
        await client.query(`UPDATE queue SET status = 'assigned', assigned_booking_id = $1 WHERE id = $2`, [newBooking.id, queueId]);

        // Shift others down
        await client.query(
            `UPDATE queue SET position = position - 1 WHERE station_id = $1 AND status = 'waiting' AND position > $2`,
            [queueEntry.station_id, queueEntry.position]
        );

        await client.query('COMMIT');

        // Socket notifications
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${userId}`).emit('slot_assigned', {
                stationId: queueEntry.station_id,
                slotId: queueEntry.assigned_slot_id,
                bookingId: newBooking.id,
                message: `🎉 Great news! You have accepted the slot. Your booking is now active.`,
            });

            io.to(`station_${queueEntry.station_id}`).emit('slot_status_changed', {
                stationId: queueEntry.station_id,
                slotId: queueEntry.assigned_slot_id,
                status: 'occupied',
                message: 'Slot occupied from queue offer'
            });

            // Notify all remaining queued users of their updated positions
            const remainingQueue = await query(
                `SELECT user_id, position FROM queue WHERE station_id = $1 AND status = 'waiting' ORDER BY position`,
                [queueEntry.station_id]
            );
            remainingQueue.rows.forEach((entry) => {
                io.to(`user_${entry.user_id}`).emit('queue_position_updated', {
                    stationId: queueEntry.station_id,
                    position: entry.position,
                    status: 'waiting',
                });
            });

            io.to(`station_${queueEntry.station_id}`).emit('queue_updated', {
                stationId: queueEntry.station_id,
                queue_length: remainingQueue.rows.length,
            });
        }

        res.json({ success: true, booking: newBooking });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

/**
 * POST /api/queue/decline-offer
 * Declines a slot offer and passes it to the next person.
 */
const declineOffer = async (req, res, next) => {
    const client = await getClient();
    try {
        const { queueId } = req.body;
        const userId = req.user.id;
        const io = req.app.get('io');

        await client.query('BEGIN');

        // Find the queue entry
        const queueResult = await client.query(
            `SELECT * FROM queue WHERE id = $1 AND user_id = $2 AND status = 'offered' FOR UPDATE`,
            [queueId, userId]
        );

        if (queueResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(new AppError('Offer not found or already processed', 404));
        }

        // Auto-assign to next person
        const { autoAssignFromQueue } = require('../services/queueService');

        const queueEntry = queueResult.rows[0];

        // Mark queue entry as cancelled (or expired/declined)
        await client.query(`UPDATE queue SET status = 'cancelled' WHERE id = $1`, [queueId]);

        // Shift others down
        await client.query(
            `UPDATE queue SET position = position - 1 WHERE station_id = $1 AND status = 'waiting' AND position > $2`,
            [queueEntry.station_id, queueEntry.position]
        );

        await client.query('COMMIT');

        // Attempt offering it to the next queue person asynchronously
        autoAssignFromQueue({ stationId: queueEntry.station_id, slotId: queueEntry.assigned_slot_id, io });

        res.json({ success: true, message: 'Offer declined.' });

    } catch (err) {
        if (client) await client.query('ROLLBACK');
        next(err);
    } finally {
        if (client) client.release();
    }
};

/**
 * POST /api/queue
 * Adds the authenticated user to the queue for a station.
 * Prevents duplicate queue entries for the same user+station.
 */
const joinQueue = async (req, res, next) => {
    const client = await getClient();
    try {
        const stationId = parseInt(req.body.stationId);
        const userId = req.user.id;

        if (!stationId) {
            return next(new AppError('Station ID is required.', 400));
        }

        await client.query('BEGIN');

        // Check if station exists and is active
        const stationResult = await client.query(
            `SELECT id, name FROM stations WHERE id = $1 AND status = 'active' FOR SHARE`,
            [stationId]
        );
        if (stationResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(new AppError('Station not found or inactive.', 404));
        }

        // Check if user is already in queue for this station
        const existingQueue = await client.query(
            `SELECT id, position FROM queue WHERE user_id = $1 AND station_id = $2 AND status = 'waiting' FOR UPDATE`,
            [userId, stationId]
        );
        if (existingQueue.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.json({
                success: true,
                message: 'You are already in the queue.',
                queueEntry: existingQueue.rows[0],
            });
        }

        // Check if user has an active booking (no need to queue)
        const activeBooking = await client.query(
            `SELECT id FROM bookings WHERE user_id = $1 AND status = 'active'`,
            [userId]
        );
        if (activeBooking.rows.length > 0) {
            await client.query('ROLLBACK');
            return next(new AppError('You already have an active booking at a station.', 409));
        }

        // Get the next queue position (max position + 1)
        const positionResult = await client.query(
            `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
             FROM queue
             WHERE station_id = $1 AND status = 'waiting'`,
            [stationId]
        );
        const position = positionResult.rows[0].next_position;

        // Insert into queue
        const insertResult = await client.query(
            `INSERT INTO queue (user_id, station_id, position, status)
             VALUES ($1, $2, $3, 'waiting')
             RETURNING *`,
            [userId, stationId, position]
        );

        const queueEntry = insertResult.rows[0];

        await client.query('COMMIT');

        // Notify the user of their queue position via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${userId}`).emit('queue_position_updated', {
                stationId,
                stationName: stationResult.rows[0].name,
                position,
                status: 'waiting',
            });

            // Broadcast updated queue length to all station watchers
            const queueLengthResult = await query(
                `SELECT COUNT(*) AS queue_length FROM queue WHERE station_id = $1 AND status = 'waiting'`,
                [stationId]
            );
            io.to(`station_${stationId}`).emit('queue_updated', {
                stationId,
                queue_length: parseInt(queueLengthResult.rows[0].queue_length),
            });
        }

        res.status(201).json({
            success: true,
            message: `You are #${position} in the queue. We'll notify you when a slot is available.`,
            queueEntry,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

/**
 * GET /api/queue/:stationId/status
 * Returns the current user's queue position for a specific station.
 */
const getQueueStatus = async (req, res, next) => {
    try {
        const stationId = parseInt(req.params.stationId);
        const userId = req.user.id;

        const result = await query(
            `SELECT q.*, s.name AS station_name
       FROM queue q
       JOIN stations s ON q.station_id = s.id
       WHERE q.user_id = $1 AND q.station_id = $2 AND q.status = 'waiting'`,
            [userId, stationId]
        );

        if (result.rows.length === 0) {
            return res.json({ success: true, inQueue: false });
        }

        // Get total queue length for context
        const totalResult = await query(
            `SELECT COUNT(*) AS total FROM queue WHERE station_id = $1 AND status = 'waiting'`,
            [stationId]
        );

        res.json({
            success: true,
            inQueue: true,
            queueEntry: result.rows[0],
            totalInQueue: parseInt(totalResult.rows[0].total),
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/queue/:id  (leave by queue entry ID)
 * DELETE /api/queue/:stationId/leave  (leave by station ID - looks up queue entry)
 * Removes the user from the queue and re-orders positions.
 */
const leaveQueue = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const paramId = parseInt(req.params.id || req.params.stationId);

        let queueResult;

        // Determine if the param is a stationId (from /stationId/leave route)
        // or a queue entry ID (from /:id legacy route).
        // We try to find by stationId first if it came from the /leave sub-route.
        if (req.path.endsWith('/leave')) {
            // Route was /:stationId/leave — find queue entry by stationId
            queueResult = await query(
                `SELECT * FROM queue WHERE station_id = $1 AND user_id = $2 AND status = 'waiting'`,
                [paramId, userId]
            );
        } else {
            // Legacy route: /:id — find queue entry by queue entry id
            queueResult = await query(
                `SELECT * FROM queue WHERE id = $1 AND user_id = $2 AND status = 'waiting'`,
                [paramId, userId]
            );
        }

        if (queueResult.rows.length === 0) {
            return next(new AppError('Queue entry not found or you are not authorized.', 404));
        }

        const { id: queueId, station_id, position } = queueResult.rows[0];

        // Mark as cancelled
        await query(
            `UPDATE queue SET status = 'cancelled' WHERE id = $1`,
            [queueId]
        );

        // Re-order positions for remaining waiting users
        await query(
            `UPDATE queue
       SET position = position - 1
       WHERE station_id = $1 AND status = 'waiting' AND position > $2`,
            [station_id, position]
        );

        // Notify all waiting users of their new positions via Socket.io
        const io = req.app.get('io');
        const waitingUsers = await query(
            `SELECT user_id, position FROM queue WHERE station_id = $1 AND status = 'waiting' ORDER BY position`,
            [station_id]
        );
        waitingUsers.rows.forEach((entry) => {
            io.to(`user_${entry.user_id}`).emit('queue_position_updated', {
                stationId: station_id,
                position: entry.position,
                status: 'waiting',
            });
        });

        // Broadcast updated queue length
        io.to(`station_${station_id}`).emit('queue_updated', {
            stationId: station_id,
            queue_length: waitingUsers.rows.length,
        });

        res.json({ success: true, message: 'You have left the queue.' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/queue/my-queues
 * Returns all active queue entries for the authenticated user.
 */
const getMyQueues = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await query(
            `SELECT q.id, q.station_id, q.position, q.status, q.created_at AS joined_at,
                    s.name AS station_name, s.city
             FROM queue q
             JOIN stations s ON s.id = q.station_id
             WHERE q.user_id = $1 AND q.status = 'waiting'
             ORDER BY q.created_at ASC`,
            [userId]
        );
        res.json({ success: true, queues: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/queue/admin/all  (admin only)
 * Returns all currently waiting queue entries across all stations.
 */
const getAllQueues = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT q.id, q.station_id, q.user_id, q.position, q.status, q.created_at,
                    u.name AS user_name, u.email AS user_email,
                    s.name AS station_name
             FROM queue q
             JOIN users u ON u.id = q.user_id
             JOIN stations s ON s.id = q.station_id
             WHERE q.status = 'waiting'
             ORDER BY s.name, q.position ASC`
        );
        res.json({ success: true, entries: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { joinQueue, getQueueStatus, leaveQueue, getMyQueues, getAllQueues, acceptOffer, declineOffer };
