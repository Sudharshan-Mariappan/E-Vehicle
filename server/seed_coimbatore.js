const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ev_charging_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
});

const stations = [
    {
        name: 'Zeon - Brookefields Mall',
        address: '67-71, Dr Krishnasamy Mudaliyar Rd, Brookefields, Ram Nagar, Coimbatore, Tamil Nadu 641001',
        latitude: 11.0084,
        longitude: 76.9608,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Ram Nagar',
        landmark: 'Brookefields Mall',
        price_per_kwh: 18.00,
        amenities: JSON.stringify(['WiFi', 'Restrooms', 'Shopping Mall', 'Food Court', 'ATM']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2']),
        rating: 4.8
    },
    {
        name: 'Tata Power - Chinniyampalayam',
        address: 'No 138, Avinashi Road, Chinniyampalayam, Coimbatore, Tamil Nadu 641062',
        latitude: 11.0505,
        longitude: 77.0612,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Chinniyampalayam',
        landmark: 'Near Airport',
        price_per_kwh: 16.50,
        amenities: JSON.stringify(['Restrooms', 'Parking', 'CCTV']),
        connector_types: JSON.stringify(['CCS-II']),
        rating: 4.5
    },
    {
        name: 'Statiq - Welcomhotel',
        address: '1266/14, W Club Rd, Race Course, Gopalapuram, Coimbatore, Tamil Nadu 641018',
        latitude: 11.0003,
        longitude: 76.9745,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Race Course',
        landmark: 'Welcomhotel',
        price_per_kwh: 22.00,
        amenities: JSON.stringify(['WiFi', 'Restrooms', 'Cafe', 'Security']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2', 'CHAdeMO']),
        rating: 4.9
    },
    {
        name: 'Tata Power - Saibaba Colony',
        address: '1142-A, Mettupalayam Rd, Saibaba Koil, Coimbatore, Tamil Nadu 641043',
        latitude: 11.0264,
        longitude: 76.9472,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Saibaba Colony',
        landmark: 'Saibaba Temple',
        price_per_kwh: 15.00,
        amenities: JSON.stringify(['Restrooms', 'Parking']),
        connector_types: JSON.stringify(['CCS-II', 'CHAdeMO']),
        rating: 4.2
    },
    {
        name: 'Relux - Singanallur Hub',
        address: 'Trichy Main Road, Singanallur, Coimbatore, Tamil Nadu 641005',
        latitude: 11.0019,
        longitude: 77.0223,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Singanallur',
        landmark: 'Opposite Central Studio',
        price_per_kwh: 14.50,
        amenities: JSON.stringify(['Parking', 'CCTV']),
        connector_types: JSON.stringify(['Type 2']),
        rating: 4.0
    },
    {
        name: 'ChargeZone - Tidel Park',
        address: 'Avinashi Road, Civil Aerodrome Post, Coimbatore, Tamil Nadu 641014',
        latitude: 11.0285,
        longitude: 77.0305,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Hope College',
        landmark: 'Tidel Park Coimbatore',
        price_per_kwh: 19.50,
        amenities: JSON.stringify(['WiFi', 'Restrooms', 'Tech Lounge', 'Security']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2']),
        rating: 4.7
    },
    {
        name: 'Zeon - Prozone Mall',
        address: 'Sivanandhapuram, Sathy Rd, Coimbatore, Tamil Nadu 641035',
        latitude: 11.0543,
        longitude: 76.9935,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Sivanandhapuram',
        landmark: 'Prozone Mall',
        price_per_kwh: 18.50,
        amenities: JSON.stringify(['WiFi', 'Restrooms', 'Shopping Mall', 'Food Court', 'ATM', 'Parking']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2']),
        rating: 4.6
    },
    {
        name: 'Ather Grid - RS Puram',
        address: '15, DB Road, RS Puram, Coimbatore, Tamil Nadu 641002',
        latitude: 11.0080,
        longitude: 76.9485,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'RS Puram',
        landmark: 'DB Road',
        price_per_kwh: 14.00,
        amenities: JSON.stringify(['Cafe', 'Shopping', 'Parking']),
        connector_types: JSON.stringify(['Type 2', 'Ather Grid']),
        rating: 4.8
    },
    {
        name: 'Tata Power - Kovaipudur',
        address: 'VLB Engineering College Rd, Kovaipudur, Coimbatore, Tamil Nadu 641042',
        latitude: 10.9256,
        longitude: 76.9385,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Kovaipudur',
        landmark: 'VLB Engineering College',
        price_per_kwh: 15.50,
        amenities: JSON.stringify(['Parking', 'Restrooms']),
        connector_types: JSON.stringify(['CCS-II']),
        rating: 4.1
    },
    {
        name: 'BPCL Pulse - Gandhipuram',
        address: 'Nanjappa Rd, Gandhipuram, Coimbatore, Tamil Nadu 641012',
        latitude: 11.0182,
        longitude: 76.9660,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Gandhipuram',
        landmark: 'Omni Bus Stand',
        price_per_kwh: 16.00,
        amenities: JSON.stringify(['Restrooms', 'ATM', 'Water']),
        connector_types: JSON.stringify(['CCS-II', 'CHAdeMO']),
        rating: 4.3
    },
    {
        name: 'Statiq - Peelamedu',
        address: 'Avinashi Rd, Peelamedu, Coimbatore, Tamil Nadu 641004',
        latitude: 11.0250,
        longitude: 77.0015,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Peelamedu',
        landmark: 'Fun Republic Mall',
        price_per_kwh: 19.00,
        amenities: JSON.stringify(['WiFi', 'Shopping Center', 'Food', 'Restrooms']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2']),
        rating: 4.5
    },
    {
        name: 'Relux - Saravanampatti',
        address: 'Thudiyalur Rd, CHIL SEZ IT Park, Saravanampatti, Coimbatore, Tamil Nadu 641035',
        latitude: 11.0790,
        longitude: 76.9985,
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        local_area: 'Saravanampatti',
        landmark: 'KGISL IT Park',
        price_per_kwh: 15.00,
        amenities: JSON.stringify(['WiFi', 'Cafe', 'Tech Lounge', 'Security']),
        connector_types: JSON.stringify(['CCS-II', 'Type 2']),
        rating: 4.4
    }
];

const users = [
    { name: 'Admin Coimbatore', email: 'admin@ev.com', password: 'admin123', role: 'admin', wallet: 5000 },
    { name: 'Suresh Kumar', email: 'suresh@gmail.com', password: 'user123', role: 'user', wallet: 1200 },
    { name: 'Anitha Raj', email: 'anitha@yahoo.com', password: 'user123', role: 'user', wallet: 850 },
    { name: 'Vijay Mani', email: 'vijay@outlook.com', password: 'user123', role: 'user', wallet: 420 },
    { name: 'Deepa Lakshmi', email: 'deepa@gmail.com', password: 'user123', role: 'user', wallet: 1500 }
];

async function seed() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Enhanced Coimbatore Seeding ---');

        await client.query('BEGIN');

        // Ensure missing tables exist
        console.log('Ensuring optional tables exist...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id              SERIAL PRIMARY KEY,
                user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                amount          DECIMAL(10, 2) NOT NULL,
                type            VARCHAR(10) CHECK (type IN ('CREDIT', 'DEBIT')),
                description     TEXT,
                created_at      TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id              SERIAL PRIMARY KEY,
                user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                station_id      INTEGER REFERENCES stations(id) ON DELETE CASCADE,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, station_id)
            );
        `);

        // Truncate all tables
        console.log('Clearing existing data...');
        await client.query('TRUNCATE notifications, queue, bookings, reviews, slots, stations, users, transactions, favorites RESTART IDENTITY CASCADE');

        // 1. Seed Users
        console.log('Seeding users and initial wallet transactions...');
        const userMap = {};
        for (const u of users) {
            const hash = await bcrypt.hash(u.password, 12);
            const res = await client.query(
                'INSERT INTO users (name, email, password_hash, role, wallet_balance) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [u.name, u.email, hash, u.role, u.wallet]
            );
            const userId = res.rows[0].id;
            userMap[u.email] = userId;

            // Initial credit transaction
            await client.query(
                "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'CREDIT', 'Initial Wallet Balance')",
                [userId, u.wallet]
            );
        }

        // 2. Seed Stations & Slots
        console.log('Seeding Coimbatore stations and slots...');
        const stationIds = [];
        const stationMap = {}; // name -> id
        const slotMap = {}; // stationId -> [slotIds]

        for (const s of stations) {
            const res = await client.query(
                `INSERT INTO stations (name, address, latitude, longitude, city, district, state, local_area, landmark, price_per_kwh, amenities, connector_types, rating) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
                [s.name, s.address, s.latitude, s.longitude, s.city, s.district, s.state, s.local_area, s.landmark, s.price_per_kwh, s.amenities, s.connector_types, s.rating]
            );
            const stationId = res.rows[0].id;
            stationIds.push(stationId);
            stationMap[s.name] = stationId;
            slotMap[stationId] = [];

            const connectors = JSON.parse(s.connector_types);
            let slotNum = 1;
            for (const conn of connectors) {
                const resSlot = await client.query(
                    `INSERT INTO slots (station_id, slot_name, connector_type, power_kw, status) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [stationId, `Slot-${slotNum++}`, conn, conn.includes('CCS') ? 50 : 22, 'available']
                );
                slotMap[stationId].push(resSlot.rows[0].id);
            }

            // Add occupied slots for realism
            await client.query(
                `INSERT INTO slots (station_id, slot_name, connector_type, power_kw, status) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [stationId, `Slot-${slotNum++}`, connectors[0], connectors[0].includes('CCS') ? 50 : 22, 'occupied']
            );
        }

        // 3. Seed Favorites
        console.log('Seeding user favorites...');
        const sureshId = userMap['suresh@gmail.com'];
        await client.query('INSERT INTO favorites (user_id, station_id) VALUES ($1, $2)', [sureshId, stationMap['Zeon - Brookefields Mall']]);
        await client.query('INSERT INTO favorites (user_id, station_id) VALUES ($1, $2)', [sureshId, stationMap['Statiq - Welcomhotel']]);

        // 4. Seed Reviews
        console.log('Seeding Coimbatore station reviews...');
        const reviewComments = [
            'Fast charging at Brookefields, very convenient!',
            'Welcomhotel charging is premium but worth it for the cafe.',
            'Tidel Park station is always reliable for commuters.',
            'A bit crowded during peak hours near Saibaba temple.',
            'Easy to use with the app, great Coimbatore network.'
        ];

        for (const [email, userId] of Object.entries(userMap)) {
            if (email.includes('admin')) continue;
            const randomStationId = stationIds[Math.floor(Math.random() * stationIds.length)];
            await client.query(
                'INSERT INTO reviews (user_id, station_id, rating, comment) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
                [userId, randomStationId, 4 + Math.floor(Math.random() * 2), reviewComments[Math.floor(Math.random() * reviewComments.length)]]
            );
        }

        // 5. Seed Bookings
        console.log('Seeding booking history and active sessions...');
        for (let i = 0; i < 15; i++) {
            const email = Object.keys(userMap)[Math.floor(Math.random() * users.length)];
            const userId = userMap[email];
            const stationId = stationIds[Math.floor(Math.random() * stationIds.length)];
            const slotId = slotMap[stationId][0];

            const cost = 250 + Math.random() * 500;
            const energy = 20 + Math.random() * 30;

            await client.query(
                `INSERT INTO bookings (user_id, station_id, slot_id, status, start_time, end_time, energy_consumed, total_cost, payment_status) 
                 VALUES ($1, $2, $3, 'completed', NOW() - INTERVAL '${i + 1} days', NOW() - INTERVAL '${i} days', $4, $5, 'paid')`,
                [userId, stationId, slotId, energy, cost]
            );

            // Debit transaction
            await client.query(
                "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'DEBIT', 'EV Charging - Coimbatore Station')",
                [userId, cost]
            );
        }

        // 6. Seed Queue
        console.log('Seeding queue for busy stations...');
        const tidelParkId = stationMap['ChargeZone - Tidel Park'];
        await client.query(
            "INSERT INTO queue (user_id, station_id, position, status) VALUES ($1, $2, 1, 'waiting')",
            [userMap['anitha@yahoo.com'], tidelParkId]
        );
        await client.query(
            "INSERT INTO queue (user_id, station_id, position, status) VALUES ($1, $2, 2, 'waiting')",
            [userMap['vijay@outlook.com'], tidelParkId]
        );

        // 7. Seed Notifications
        console.log('Seeding notifications...');
        await client.query(
            "INSERT INTO notifications (user_id, type, message) VALUES ($1, 'success', 'Welcome to the Coimbatore EV Network!')",
            [sureshId]
        );
        await client.query(
            "INSERT INTO notifications (user_id, type, message) VALUES ($1, 'info', 'Zeon Brookefields station is now available.')",
            [sureshId]
        );

        await client.query('COMMIT');
        console.log('✅ Enhanced Seeding completed successfully!');
        console.log('Explore the app using: suresh@gmail.com / user123');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Seeding failed:', err.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
