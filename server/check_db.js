const { Pool } = require('pg');
require('dotenv').config({ path: 'd:/Mini Project -II Folders/Project Files/E Vehicle Charge station Management System/server/.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'ev_charging_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

async function check() {
    try {
        const stations = await pool.query('SELECT COUNT(*) FROM stations');
        const slots = await pool.query('SELECT COUNT(*) FROM slots');
        const firstStation = await pool.query('SELECT id, name, latitude, longitude FROM stations LIMIT 1');

        console.log('Database Check:');
        console.log('Stations count:', stations.rows[0].count);
        console.log('Slots count:', slots.rows[0].count);
        console.log('First station:', firstStation.rows[0]);
    } catch (err) {
        console.error('Check failed:', err.message);
    } finally {
        await pool.end();
    }
}

check();
