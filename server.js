const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password', // Change this to your MySQL password
    database: 'ev_charging_stations',
    charset: 'utf8mb4'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Razorpay configuration
const RAZORPAY_KEY_ID = 'your_razorpay_key_id'; // Replace with your Razorpay Key ID
const RAZORPAY_KEY_SECRET = 'your_razorpay_key_secret'; // Replace with your Razorpay Key Secret

// Routes

// Get all charging stations
app.get('/api/stations', (req, res) => {
    const query = `
        SELECT 
            cs.*,
            COUNT(c.charger_id) as total_chargers,
            COUNT(CASE WHEN c.status = 'Available' THEN 1 END) as available_chargers
        FROM charging_stations cs
        LEFT JOIN chargers c ON cs.station_id = c.station_id
        WHERE cs.status = 'Active'
        GROUP BY cs.station_id
        ORDER BY cs.station_id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stations:', err);
            res.status(500).json({ error: 'Failed to fetch stations' });
        } else {
            res.json(results);
        }
    });
});

// Get stations near a location
app.get('/api/stations/nearby', (req, res) => {
    const { lat, lng, radius = 10 } = req.query;

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const query = `
        SELECT 
            cs.*,
            COUNT(c.charger_id) as total_chargers,
            COUNT(CASE WHEN c.status = 'Available' THEN 1 END) as available_chargers,
            (6371 * acos(cos(radians(?)) * cos(radians(cs.latitude)) * 
             cos(radians(cs.longitude) - radians(?)) + 
             sin(radians(?)) * sin(radians(cs.latitude)))) AS distance
        FROM charging_stations cs
        LEFT JOIN chargers c ON cs.station_id = c.station_id
        WHERE cs.status = 'Active'
        GROUP BY cs.station_id
        HAVING distance < ?
        ORDER BY distance ASC
    `;

    db.query(query, [lat, lng, lat, radius], (err, results) => {
        if (err) {
            console.error('Error fetching nearby stations:', err);
            res.status(500).json({ error: 'Failed to fetch nearby stations' });
        } else {
            res.json(results);
        }
    });
});

// Get stations by district
app.get('/api/stations/district/:district', (req, res) => {
    const district = req.params.district;

    const query = `
        SELECT 
            cs.*,
            COUNT(c.charger_id) as total_chargers,
            COUNT(CASE WHEN c.status = 'Available' THEN 1 END) as available_chargers
        FROM charging_stations cs
        LEFT JOIN chargers c ON cs.station_id = c.station_id
        WHERE cs.status = 'Active' AND cs.district = ?
        GROUP BY cs.station_id
        ORDER BY cs.rating DESC, available_chargers DESC
    `;

    db.query(query, [district], (err, results) => {
        if (err) {
            console.error('Error fetching stations by district:', err);
            res.status(500).json({ error: 'Failed to fetch stations by district' });
        } else {
            res.json(results);
        }
    });
});

// Get all districts
app.get('/api/districts', (req, res) => {
    const query = `
        SELECT DISTINCT district, state, COUNT(*) as station_count
        FROM charging_stations 
        WHERE status = 'Active'
        GROUP BY district, state
        ORDER BY state, district
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching districts:', err);
            res.status(500).json({ error: 'Failed to fetch districts' });
        } else {
            res.json(results);
        }
    });
});

// Get stations by local area search
app.get('/api/stations/search', (req, res) => {
    const { query, state, district, local_area } = req.query;

    let whereConditions = ['cs.status = "Active"'];
    let queryParams = [];

    // Build dynamic query based on provided filters
    if (state) {
        whereConditions.push('cs.state = ?');
        queryParams.push(state);
    }

    if (district) {
        whereConditions.push('cs.district = ?');
        queryParams.push(district);
    }

    if (local_area) {
        whereConditions.push('(cs.local_area LIKE ? OR cs.landmark LIKE ? OR cs.address LIKE ?)');
        const searchTerm = `%${local_area}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (query) {
        whereConditions.push('(cs.station_name LIKE ? OR cs.local_area LIKE ? OR cs.landmark LIKE ? OR cs.address LIKE ?)');
        const searchTerm = `%${query}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.join(' AND ');

    const sqlQuery = `
        SELECT 
            cs.*,
            COUNT(c.charger_id) as total_chargers,
            COUNT(CASE WHEN c.status = 'Available' THEN 1 END) as available_chargers
        FROM charging_stations cs
        LEFT JOIN chargers c ON cs.station_id = c.station_id
        WHERE ${whereClause}
        GROUP BY cs.station_id
        ORDER BY cs.rating DESC, available_chargers DESC, cs.station_name ASC
    `;

    db.query(sqlQuery, queryParams, (err, results) => {
        if (err) {
            console.error('Error searching stations:', err);
            res.status(500).json({ error: 'Failed to search stations' });
        } else {
            res.json(results);
        }
    });
});

// Get local areas by district
app.get('/api/local-areas/:district', (req, res) => {
    const district = req.params.district;

    const query = `
        SELECT DISTINCT local_area, landmark, COUNT(*) as station_count
        FROM charging_stations 
        WHERE status = 'Active' AND district = ? AND local_area IS NOT NULL
        GROUP BY local_area, landmark
        ORDER BY station_count DESC, local_area ASC
    `;

    db.query(query, [district], (err, results) => {
        if (err) {
            console.error('Error fetching local areas:', err);
            res.status(500).json({ error: 'Failed to fetch local areas' });
        } else {
            res.json(results);
        }
    });
});

// Get popular landmarks
app.get('/api/landmarks', (req, res) => {
    const { state, district } = req.query;

    let whereConditions = ['status = "Active"', 'landmark IS NOT NULL'];
    let queryParams = [];

    if (state) {
        whereConditions.push('state = ?');
        queryParams.push(state);
    }

    if (district) {
        whereConditions.push('district = ?');
        queryParams.push(district);
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
        SELECT DISTINCT landmark, local_area, district, state, COUNT(*) as station_count
        FROM charging_stations 
        WHERE ${whereClause}
        GROUP BY landmark, local_area, district, state
        ORDER BY station_count DESC, landmark ASC
        LIMIT 20
    `;

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error fetching landmarks:', err);
            res.status(500).json({ error: 'Failed to fetch landmarks' });
        } else {
            res.json(results);
        }
    });
});

// Get station details with chargers
app.get('/api/stations/:id', (req, res) => {
    const stationId = req.params.id;

    const stationQuery = 'SELECT * FROM charging_stations WHERE station_id = ?';
    const chargersQuery = 'SELECT * FROM chargers WHERE station_id = ?';

    db.query(stationQuery, [stationId], (err, stationResults) => {
        if (err) {
            console.error('Error fetching station:', err);
            res.status(500).json({ error: 'Failed to fetch station' });
        } else if (stationResults.length === 0) {
            res.status(404).json({ error: 'Station not found' });
        } else {
            db.query(chargersQuery, [stationId], (err, chargerResults) => {
                if (err) {
                    console.error('Error fetching chargers:', err);
                    res.status(500).json({ error: 'Failed to fetch chargers' });
                } else {
                    res.json({
                        station: stationResults[0],
                        chargers: chargerResults
                    });
                }
            });
        }
    });
});

// Create charging session
app.post('/api/sessions', (req, res) => {
    const { user_id, station_id, charger_id, estimated_duration } = req.body;

    const query = `
        INSERT INTO charging_sessions (user_id, station_id, charger_id, start_time, duration_minutes)
        VALUES (?, ?, ?, NOW(), ?)
    `;

    db.query(query, [user_id, station_id, charger_id, estimated_duration], (err, result) => {
        if (err) {
            console.error('Error creating session:', err);
            res.status(500).json({ error: 'Failed to create session' });
        } else {
            // Update charger status to occupied
            const updateChargerQuery = `
                UPDATE chargers 
                SET status = 'Occupied', current_user_id = ?, session_start_time = NOW()
                WHERE charger_id = ?
            `;

            db.query(updateChargerQuery, [user_id, charger_id], (err) => {
                if (err) {
                    console.error('Error updating charger status:', err);
                }
            });

            res.json({
                session_id: result.insertId,
                message: 'Charging session started successfully'
            });
        }
    });
});

// End charging session
app.put('/api/sessions/:id/end', (req, res) => {
    const sessionId = req.params.id;
    const { energy_consumed, duration_minutes } = req.body;

    // Get session details
    const sessionQuery = 'SELECT * FROM charging_sessions WHERE session_id = ?';

    db.query(sessionQuery, [sessionId], (err, sessionResults) => {
        if (err || sessionResults.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const session = sessionResults[0];

        // Calculate total cost
        const stationQuery = 'SELECT price_per_kwh FROM charging_stations WHERE station_id = ?';

        db.query(stationQuery, [session.station_id], (err, stationResults) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to calculate cost' });
            }

            const pricePerKwh = stationResults[0].price_per_kwh;
            const totalCost = energy_consumed * pricePerKwh;

            // Update session
            const updateSessionQuery = `
                UPDATE charging_sessions 
                SET end_time = NOW(), energy_consumed = ?, duration_minutes = ?, total_cost = ?
                WHERE session_id = ?
            `;

            db.query(updateSessionQuery, [energy_consumed, duration_minutes, totalCost, sessionId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update session' });
                }

                // Update charger status to available
                const updateChargerQuery = `
                    UPDATE chargers 
                    SET status = 'Available', current_user_id = NULL, session_start_time = NULL
                    WHERE charger_id = ?
                `;

                db.query(updateChargerQuery, [session.charger_id], (err) => {
                    if (err) {
                        console.error('Error updating charger status:', err);
                    }
                });

                res.json({
                    session_id: sessionId,
                    total_cost: totalCost,
                    message: 'Charging session ended successfully'
                });
            });
        });
    });
});

// Create Razorpay order
app.post('/api/payments/create-order', (req, res) => {
    const { session_id, amount } = req.body;

    const orderData = {
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt: `session_${session_id}_${Date.now()}`,
        notes: {
            session_id: session_id
        }
    };

    // In a real application, you would create the order using Razorpay API
    // For now, we'll simulate it
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store payment record
    const paymentQuery = `
        INSERT INTO payments (session_id, razorpay_order_id, amount, currency, status)
        VALUES (?, ?, ?, 'INR', 'Created')
    `;

    db.query(paymentQuery, [session_id, orderId, amount], (err, result) => {
        if (err) {
            console.error('Error creating payment:', err);
            res.status(500).json({ error: 'Failed to create payment' });
        } else {
            res.json({
                order_id: orderId,
                amount: orderData.amount,
                currency: orderData.currency,
                key_id: RAZORPAY_KEY_ID
            });
        }
    });
});

// Verify payment
app.post('/api/payments/verify', (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // In a real application, you would verify the signature using Razorpay
    // For now, we'll simulate successful verification

    const updatePaymentQuery = `
        UPDATE payments 
        SET razorpay_payment_id = ?, status = 'Captured'
        WHERE razorpay_order_id = ?
    `;

    db.query(updatePaymentQuery, [razorpay_payment_id, razorpay_order_id], (err) => {
        if (err) {
            console.error('Error updating payment:', err);
            res.status(500).json({ error: 'Failed to verify payment' });
        } else {
            // Update session payment status
            const updateSessionQuery = `
                UPDATE charging_sessions 
                SET payment_status = 'Paid', payment_id = ?
                WHERE session_id = (
                    SELECT session_id FROM payments WHERE razorpay_order_id = ?
                )
            `;

            db.query(updateSessionQuery, [razorpay_payment_id, razorpay_order_id], (err) => {
                if (err) {
                    console.error('Error updating session:', err);
                }
            });

            res.json({
                success: true,
                message: 'Payment verified successfully'
            });
        }
    });
});

// Get user sessions
app.get('/api/users/:id/sessions', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT 
            cs.*,
            st.station_name,
            st.address,
            ch.charger_name,
            ch.connector_type
        FROM charging_sessions cs
        JOIN charging_stations st ON cs.station_id = st.station_id
        JOIN chargers ch ON cs.charger_id = ch.charger_id
        WHERE cs.user_id = ?
        ORDER BY cs.start_time DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user sessions:', err);
            res.status(500).json({ error: 'Failed to fetch sessions' });
        } else {
            res.json(results);
        }
    });
});

// Create reservation
app.post('/api/reservations', (req, res) => {
    const { user_id, station_id, charger_id, reservation_time, duration_minutes } = req.body;

    const query = `
        INSERT INTO reservations (user_id, station_id, charger_id, reservation_time, duration_minutes)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(query, [user_id, station_id, charger_id, reservation_time, duration_minutes], (err, result) => {
        if (err) {
            console.error('Error creating reservation:', err);
            res.status(500).json({ error: 'Failed to create reservation' });
        } else {
            res.json({
                reservation_id: result.insertId,
                message: 'Reservation created successfully'
            });
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
