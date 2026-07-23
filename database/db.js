// database/db.js - PostgreSQL for Railway
const { Pool } = require('pg');

let pool = null;

function getDB() {
    if (pool) return pool;
    
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    initTables();
    return pool;
}

async function initTables() {
    const client = await pool.connect();
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(100) UNIQUE,
            whatsapp_number VARCHAR(20),
            whatsapp_linked BOOLEAN DEFAULT FALSE,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS groups (
            id SERIAL PRIMARY KEY,
            group_id VARCHAR(100) UNIQUE NOT NULL,
            group_name VARCHAR(255),
            is_locked BOOLEAN DEFAULT FALSE,
            slow_mode INT DEFAULT 0,
            welcome_msg TEXT,
            rules TEXT,
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS warnings (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            group_id VARCHAR(100) NOT NULL,
            count INT DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            group_id VARCHAR(100),
            user_id VARCHAR(100),
            message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
            key VARCHAR(50) PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    client.release();
    console.log('✅ PostgreSQL tables ready');
}

async function query(sql, params = []) {
    const db = getDB();
    const result = await db.query(sql, params);
    return result.rows;
}

async function run(sql, params = []) {
    const db = getDB();
    const result = await db.query(sql, params);
    return result;
}

module.exports = { getDB, query, run };