// index.js - NEXUS WhatsApp Bot v2.0
require('dotenv').config();

// ============================================================
// 🔥 FIX: Puppeteer Chrome path for Render
// ============================================================
const os = require('os');

// If running on Render, set cache dir
if (process.env.RENDER) {
    process.env.PUPPETEER_CACHE_DIR = '/opt/render/.cache/puppeteer';
    console.log('📦 Running on Render - Puppeteer cache set');
}

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ... rest of your code ...
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// DATABASE (PostgreSQL)
// ============================================================
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

// ============================================================
// WHATSAPP CLIENT
// ============================================================
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'nexus-bot',
        dataPath: './sessions'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;
let startTime = Date.now();
const warnings = new Map();

// ============================================================
// LOGGER
// ============================================================
function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${type}] ${message}`);
}

// ============================================================
// CHECK IF USER IS ADMIN
// ============================================================
async function isUserAdmin(chatId, userId) {
    try {
        const chat = await client.getChatById(chatId);
        const contact = await chat.getContact(userId);
        return contact.isAdmin || contact.isSuperAdmin;
    } catch (e) {
        return false;
    }
}

// ============================================================
// GEMINI AI
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt) {
    if (!GEMINI_API_KEY) {
        return "⚠️ Gemini API key not configured.";
    }
    
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        
        const data = response.data;
        
        if (data.error) {
            return `❌ AI Error: ${data.error.message}`;
        }
        
        if (data.candidates && data.candidates[0]) {
            return data.candidates[0].content.parts[0].text;
        }
        
        return "🤔 Could not generate response.";
    } catch (e) {
        return `❌ Error: ${e.message}`;
    }
}

// ============================================================
// WHATSAPP EVENTS
// ============================================================
client.on('qr', (qr) => {
    console.log('📱 Scan this QR code:');
    qrcode.generate(qr, { small: true });
    log('QR code generated', 'QR');
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp bot is ready!');
    log('Bot ready', 'READY');
});

// ============================================================
// WHATSAPP COMMANDS
// ============================================================
client.on('message', async (msg) => {
    if (!msg.body) return;
    
    const body = msg.body.trim();
    const chatId = msg.from;
    const userId = msg.author || msg.from;
    
    log(`Message: ${body.substring(0, 50)} from ${chatId}`, 'MSG');
    
    // Store message
    try {
        await run(
            'INSERT INTO messages (group_id, user_id, message) VALUES ($1, $2, $3)',
            [chatId, userId, body]
        );
    } catch (e) {}
    
    // ============================================================
    // USER COMMANDS
    // ============================================================
    
    // /help
    if (body === '/help') {
        let text = '👋 **NEXUS BOT HELP**\n─────────────────\n\n';
        text += '🔹 **USER COMMANDS:**\n';
        text += '   /help - Show this menu\n';
        text += '   /rules - Show group rules\n';
        text += '   /id - Get your ID\n';
        text += '   /ping - Check bot response\n';
        text += '   /ask [question] - Ask AI\n';
        text += '   /report @user - Report a user\n\n';
        text += '🔑 **ADMIN COMMANDS:**\n';
        text += '   .del - Delete message\n';
        text += '   .ban - Ban user\n';
        text += '   .kick - Kick user\n';
        text += '   .mute - Mute user\n';
        text += '   .warn - Warn user\n';
        text += '   .lock - Lock group\n';
        text += '   .unlock - Unlock group\n';
        text += '   .setrules - Set rules\n';
        text += '   .adminlist - List admins\n';
        text += '   .stats - Group statistics';
        await client.sendMessage(chatId, text);
        return;
    }
    
    // /rules
    if (body === '/rules') {
        await client.sendMessage(chatId, '📜 **GROUP RULES**\n─────────────────\n\nNo rules set yet.');
        return;
    }
    
    // /id
    if (body === '/id') {
        await client.sendMessage(chatId, `🆔 Your ID: ${userId}`);
        return;
    }
    
    // /ping
    if (body === '/ping') {
        const start = Date.now();
        await client.sendMessage(chatId, '🏓 Pong!');
        const end = Date.now();
        await client.sendMessage(chatId, `⏱️ ${end - start}ms`);
        return;
    }
    
    // /ask
    if (body.startsWith('/ask ')) {
        const question = body.substring(5);
        await client.sendMessage(chatId, '🤔 Thinking...');
        const response = await askGemini(question);
        await client.sendMessage(chatId, `🤖 **AI Response:**\n\n${response}`);
        return;
    }
    
    // /report
    if (body.startsWith('/report ')) {
        await client.sendMessage(chatId, '✅ Report sent to admin!');
        return;
    }
    
    // ============================================================
    // ADMIN COMMANDS
    // ============================================================
    
    const admin = await isUserAdmin(chatId, userId);
    if (!admin) return;
    
    // .del
    if (body === '.del') {
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(chatId, 'ℹ️ Reply to a message with .del');
            return;
        }
        try {
            const quoted = await msg.getQuotedMessage();
            await quoted.delete(true);
            await client.sendMessage(chatId, '🗑️ Message deleted');
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .ban
    if (body === '.ban') {
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(chatId, 'ℹ️ Reply to a user\'s message with .ban');
            return;
        }
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(chatId, `✅ ${contact.name || contact.number} has been BANNED!`);
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .kick
    if (body === '.kick') {
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(chatId, 'ℹ️ Reply to a user\'s message with .kick');
            return;
        }
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(chatId, `✅ ${contact.name || contact.number} has been KICKED!`);
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .mute
    if (body === '.mute') {
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(chatId, 'ℹ️ Reply to a user\'s message with .mute');
            return;
        }
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(chatId, `🔇 ${contact.name || contact.number} has been MUTED for 5 minutes!`);
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .warn
    if (body === '.warn') {
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(chatId, 'ℹ️ Reply to a user\'s message with .warn');
            return;
        }
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            const targetId = contact.id._serialized;
            
            if (!warnings.has(chatId)) warnings.set(chatId, new Map());
            const groupWarnings = warnings.get(chatId);
            const count = (groupWarnings.get(targetId) || 0) + 1;
            groupWarnings.set(targetId, count);
            
            await client.sendMessage(chatId, `⚠️ ${contact.name || contact.number} has been WARNED! (${count}/3)`);
            
            if (count >= 3) {
                await client.sendMessage(chatId, `🚫 ${contact.name || contact.number} has been BANNED for 3 warns!`);
                groupWarnings.delete(targetId);
            }
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .lock
    if (body === '.lock') {
        await client.sendMessage(chatId, '🔒 Group has been LOCKED!');
        return;
    }
    
    // .unlock
    if (body === '.unlock') {
        await client.sendMessage(chatId, '🔓 Group has been UNLOCKED!');
        return;
    }
    
    // .setrules
    if (body.startsWith('.setrules ')) {
        const rules = body.substring(10);
        await client.sendMessage(chatId, '✅ Rules have been updated!');
        return;
    }
    
    // .rules
    if (body === '.rules') {
        await client.sendMessage(chatId, '📜 **GROUP RULES**\n─────────────────\n\nNo rules set yet.');
        return;
    }
    
    // .adminlist
    if (body === '.adminlist') {
        try {
            const chat = await client.getChatById(chatId);
            const admins = await chat.getAdmins();
            let text = '👑 **GROUP ADMINS**\n─────────────────\n\n';
            for (const admin of admins) {
                text += `• ${admin.name || admin.number}\n`;
            }
            await client.sendMessage(chatId, text);
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
    
    // .stats
    if (body === '.stats') {
        try {
            const chat = await client.getChatById(chatId);
            const admins = await chat.getAdmins();
            const participants = await chat.getParticipants();
            
            let text = '📊 **GROUP STATISTICS**\n─────────────────\n\n';
            text += `📛 Name: ${chat.name || 'N/A'}\n`;
            text += `👥 Members: ${participants.length}\n`;
            text += `👑 Admins: ${admins.length}\n`;
            text += `🔒 Type: ${chat.isGroup ? 'Group' : 'Private'}`;
            await client.sendMessage(chatId, text);
        } catch (e) {
            await client.sendMessage(chatId, `❌ Error: ${e.message}`);
        }
        return;
    }
});

client.on('disconnected', (reason) => {
    isReady = false;
    log(`Disconnected: ${reason}`, 'DISCONNECT');
});

client.initialize();
log('Client initializing...', 'INIT');

// ============================================================
// EXPRESS ROUTES
// ============================================================
app.get('/', (req, res) => {
    res.json({
        status: isReady ? 'online' : 'offline',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: '2.0.0'
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const users = await query('SELECT COUNT(*) FROM users');
        const groups = await query('SELECT COUNT(*) FROM groups');
        const messages = await query('SELECT COUNT(*) FROM messages');
        res.json({
            users: users[0]?.count || 0,
            groups: groups[0]?.count || 0,
            messages: messages[0]?.count || 0,
            online: isReady,
            uptime: Math.floor((Date.now() - startTime) / 1000)
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/pair', async (req, res) => {
    const { phoneNumber, username } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required' });
    }
    
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const pairCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    
    try {
        await run(
            'INSERT INTO users (username, whatsapp_number, whatsapp_linked) VALUES ($1, $2, $3) ON CONFLICT (username) DO UPDATE SET whatsapp_number = $2',
            [username || 'user_' + Date.now(), cleanPhone, false]
        );
        res.json({ success: true, code: pairCode });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/send', async (req, res) => {
    const { to, message } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({ error: 'To and message required' });
    }
    
    if (!isReady) {
        return res.status(503).json({ error: 'Bot not ready' });
    }
    
    try {
        await client.sendMessage(to, message);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        connected: isReady,
        uptime: Math.floor((Date.now() - startTime) / 1000)
    });
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 NEXUS WHATSAPP BOT v2.0`);
    console.log(`${'='.repeat(50)}`);
    console.log(`🌐 Web: http://localhost:${PORT}`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`${'='.repeat(50)}\n`);
});