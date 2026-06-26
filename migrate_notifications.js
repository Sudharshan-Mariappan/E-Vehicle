const { getClient } = require('./server/config/db');
require('dotenv').config({ path: './server/.env' });

const runMigration = async () => {
    const client = await getClient();
    try {
        console.log('Applying database migration...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id          SERIAL PRIMARY KEY,
                user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type        VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
                message     TEXT NOT NULL,
                read        BOOLEAN DEFAULT FALSE,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ Migration successful: notifications table created/verified.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
