const { getClient, query } = require('../config/db');
const { sendSlotOfferedNotification } = require('./notificationService');

/**
 * Auto-assigns the first waiting user in the queue to a newly available slot.
 * Now modified to OFFER the slot and wait for user confirmation.
 *
 * Flow:
 * 1. Find the first waiting user in queue for this station (position = 1)
 * 2. Update their queue status to 'offered' and set expiry timer (5 mins)
 * 3. Emit Socket.io event 'slot_offered' to the user
 * 4. Start a 5-minute timeout to auto-expire the offer if no response
 *
 * @param {Object} params - { stationId, slotId, io }
 */
const autoAssignFromQueue = async ({ stationId, slotId, io }) => {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        // Find the first user in queue who is waiting
        const queueResult = await client.query(
            `SELECT q.*, s.name as station_name, u.name AS user_name, u.email AS user_email, sl.slot_name
       FROM queue q
       JOIN users u ON q.user_id = u.id
       JOIN stations s ON q.station_id = s.id
       JOIN slots sl ON sl.id = $2
       WHERE q.station_id = $1 AND q.status = 'waiting'
       ORDER BY q.position ASC
       LIMIT 1
       FOR UPDATE`,
            [stationId, slotId]
        );

        if (queueResult.rows.length === 0) {
            // No one in queue — ensure slot is available
            await client.query(`UPDATE slots SET status = 'available' WHERE id = $1`, [slotId]);
            await client.query('COMMIT');

            // Emit availability update for station watchers
            if (io) {
                const { emitAvailabilityUpdate } = require('./socketService');
                io.to(`station_${stationId}`).emit('slot_status_changed', {
                    stationId,
                    slotId,
                    status: 'available',
                    message: 'A slot has become available',
                });
                await emitAvailabilityUpdate(stationId, io);
            }
            return;
        }

        const queueEntry = queueResult.rows[0];

        // Mark queue entry as offered
        const updateQueue = await client.query(
            `UPDATE queue
       SET status = 'offered', assigned_slot_id = $1, offer_expires_at = NOW() + INTERVAL '5 minutes'
       WHERE id = $2 RETURNING offer_expires_at`,
            [slotId, queueEntry.id]
        );

        // Mark slot as occupied while offered
        await client.query(`UPDATE slots SET status = 'occupied' WHERE id = $1`, [slotId]);

        const offerExpiresAt = updateQueue.rows[0].offer_expires_at;

        await client.query('COMMIT');

        // ── Emit real-time notifications ──────────────────────────────────────────
        if (io) {
            io.to(`user_${queueEntry.user_id}`).emit('slot_offered', {
                stationId,
                stationName: queueEntry.station_name,
                slotId,
                slotName: queueEntry.slot_name,
                queueId: queueEntry.id,
                expiresAt: offerExpiresAt
            });
        }

        // Send push notification
        await sendSlotOfferedNotification({
            userId: queueEntry.user_id,
            stationName: queueEntry.station_name,
            slotName: queueEntry.slot_name,
            io
        });

        console.log(`✅ Queue offer: Slot ${slotId} offered to User ${queueEntry.user_id}`);

        // Set a timeout to auto-decline if no response within 5 minutes
        setTimeout(async () => {
            const checkClient = await getClient();
            try {
                await checkClient.query('BEGIN');
                const checkRes = await checkClient.query(`SELECT status FROM queue WHERE id = $1 FOR UPDATE`, [queueEntry.id]);
                if (checkRes.rows.length > 0 && checkRes.rows[0].status === 'offered') {
                    // Update to expired
                    await checkClient.query(`UPDATE queue SET status = 'expired' WHERE id = $1`, [queueEntry.id]);
                    // Shift others down
                    await checkClient.query(
                        `UPDATE queue SET position = position - 1 WHERE station_id = $1 AND status = 'waiting' AND position > $2`,
                        [stationId, queueEntry.position]
                    );
                    await checkClient.query('COMMIT');

                    console.log(`⏳ Offer expired for User ${queueEntry.user_id}`);

                    // Re-run autoAssign for the next person
                    await autoAssignFromQueue({ stationId, slotId, io });
                } else {
                    await checkClient.query('COMMIT');
                }
            } catch (e) {
                await checkClient.query('ROLLBACK');
                console.error('Auto-expire failed', e);
            } finally {
                checkClient.release();
            }
        }, 5 * 60 * 1000); // 5 minutes

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Queue auto-assignment error:', err.message);
    } finally {
        client.release();
    }
};

module.exports = { autoAssignFromQueue };
