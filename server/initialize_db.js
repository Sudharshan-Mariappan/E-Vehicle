const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
};

async function initialize() {
    console.log('Starting database initialization...');

    // 1. Create database if not exists
    const client = new Client({ ...dbConfig, database: 'postgres' });
    try {
        await client.connect();
        const dbName = process.env.DB_NAME || 'ev_charging_db';
        const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

        if (res.rowCount === 0) {
            console.log(`Creating database ${dbName}...`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database ${dbName} created.`);
        } else {
            console.log(`Database ${dbName} already exists.`);
        }
    } catch (err) {
        console.error('❌ Error creating database:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Run schema
    const dbClient = new Client({ ...dbConfig, database: process.env.DB_NAME || 'ev_charging_db' });
    try {
        await dbClient.connect();
        console.log(`Connected to target database ${process.env.DB_NAME}.`);

        const schemaPath = path.join(__dirname, '..', 'database_schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at ${schemaPath}`);
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema SQL...');
        // Split by semicolon and run separately if it's too large, or just run the whole thing
        // pg Client.query can handle multiple statements if they are not parameterized
        await dbClient.query(schemaSql);

        console.log('✅ Schema executed successfully. All tables created.');
    } catch (err) {
        console.error('❌ Error executing schema:', err.message);
        process.exit(1);
    } finally {
        await dbClient.end();
    }
}

initialize();
