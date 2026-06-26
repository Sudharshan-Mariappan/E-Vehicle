const { getClient } = require('./server/config/db');
require('dotenv').config({ path: './server/.env' });

const runMigration = async () => {
    const client = await getClient();
    try {
        console.log('Applying database migration (Favorites)...');

        // Create favorites table
        await client.query(`
            CREATE TABLE IF NOT EXISTS favorites (
                id              SERIAL PRIMARY KEY,
                user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
                station_id      INTEGER REFERENCES stations(id) ON DELETE CASCADE,
                created_at      TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, station_id)
            );
        `);
        console.log('✅ Migration successful: Favorites schema applied.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
