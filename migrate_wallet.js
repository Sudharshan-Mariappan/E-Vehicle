const { getClient } = require('./server/config/db');
require('dotenv').config({ path: './server/.env' });

const runMigration = async () => {
    const client = await getClient();
    try {
        console.log('Applying database migration (wallet system)...');

        // Add wallet_balance column
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='wallet_balance') THEN 
                    ALTER TABLE users ADD COLUMN wallet_balance DECIMAL(10, 2) DEFAULT 0.00; 
                END IF; 
            END $$;
        `);

        // Create transactions table
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
        console.log('✅ Migration successful: Wallet schema applied.');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
};

runMigration();
