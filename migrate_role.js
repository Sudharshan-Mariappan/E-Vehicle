const { getClient } = require('./server/config/db');
require('dotenv').config({ path: './server/.env' });

const runMigration = async () => {
    const client = await getClient();
    try {
        console.log('Applying database migration (add role to users)...');
        // Add role column if it doesn't exist
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN 
                    ALTER TABLE users ADD COLUMN role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')); 
                END IF; 
            END $$;
        `);
        console.log('✅ Migration successful: role column added/verified.');

        // Optional: Make the first user an admin for testing
        // await client.query(`UPDATE users SET role = 'admin' WHERE id = 1`);
        // console.log('ℹ️ Note: Check if you need to manually set an admin user.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
