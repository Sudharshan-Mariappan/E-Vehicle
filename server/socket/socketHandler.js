/**
 * Socket.io Event Handler
 *
 * Defines all real-time events for the EV Charging Station system.
 *
 * Rooms:
 *   - station_{id}  : All clients watching a specific station (for slot updates)
 *   - user_{id}     : Individual user room (for personal notifications)
 *
 * Events (Client → Server):
 *   - join_station_room    : Subscribe to a station's real-time updates
 *   - leave_station_room   : Unsubscribe from a station's updates
 *   - join_user_room       : Subscribe to personal notifications (called on login)
 *
 * Events (Server → Client):
 *   - slot_status_changed  : A slot's status changed (available/occupied/maintenance)
 *   - availability_updated : Updated available/total slot counts for a station
 *   - queue_updated        : Queue length changed for a station
 *   - queue_position_updated: User's queue position changed
 *   - slot_assigned        : User has been auto-assigned a slot from the queue
 *   - user_status_update   : General status message for a user
 */
const initSocketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // ── Client subscribes to a station's real-time updates ────────────────────
        socket.on('join_station_room', ({ stationId }) => {
            if (!stationId) return;
            const room = `station_${stationId}`;
            socket.join(room);
            console.log(`📡 Socket ${socket.id} joined room: ${room}`);

            // Acknowledge
            socket.emit('room_joined', { room, message: `Subscribed to station ${stationId} updates` });
        });

        // ── Client unsubscribes from a station ────────────────────────────────────
        socket.on('leave_station_room', ({ stationId }) => {
            if (!stationId) return;
            const room = `station_${stationId}`;
            socket.leave(room);
            console.log(`📡 Socket ${socket.id} left room: ${room}`);
        });

        // ── Client subscribes to personal notifications ───────────────────────────
        // Called after login with the user's JWT-decoded ID
        socket.on('join_user_room', ({ userId }) => {
            if (!userId) return;
            const room = `user_${userId}`;
            socket.join(room);
            console.log(`👤 Socket ${socket.id} joined user room: ${room}`);

            socket.emit('room_joined', { room, message: 'Subscribed to personal notifications' });
        });

        // ── Client leaves personal room (on logout) ───────────────────────────────
        socket.on('leave_user_room', ({ userId }) => {
            if (!userId) return;
            socket.leave(`user_${userId}`);
        });

        // ── Disconnect ────────────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
        });

        // ── Error handling ────────────────────────────────────────────────────────
        socket.on('error', (err) => {
            console.error(`❌ Socket error on ${socket.id}:`, err.message);
        });
    });
};

module.exports = { initSocketHandler };
