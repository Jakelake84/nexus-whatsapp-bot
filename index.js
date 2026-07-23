// index.js - NEXUS WhatsApp Bot v2.0
require('dotenv').config();

const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import modules
const { registerAdminCommands } = require('./commands/admin');
const { registerUserCommands } = require('./commands/user');
const { registerAIClient } = require('./commands/ai');
const { log, logError } = require('./utils/logger');
const { query, run } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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

client.on('qr', (qr) => {
    console.log('📱 Scan this QR code:');
    qrcode.generate(qr, { small: true });
    log('QR code generated', 'QR');
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WhatsApp bot is ready!');
    log('Bot ready', 'READY');
    
    // Register commands
    registerAdminCommands(client);
    registerUserCommands(client);
    registerAIClient(client);
});

client.on('message', async (msg) => {
    if (!msg.body) return;
    log(`Message: ${msg.body.substring(0, 50)} from ${msg.from}`, 'MSG');
    
    // Store message in database
    try {
        await run(
            'INSERT INTO messages (group_id, user_id, message) VALUES ($1, $2, $3)',
            [msg.from, msg.author || msg.from, msg.body]
        );
    } catch (e) {
        // Silently ignore DB errors for messages
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
app.get('/', async (req, res) => {
    const stats = {
        status: isReady ? 'online' : 'offline',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        version: '2.0.0',
        ready: isReady
    };
    res.json(stats);
});

app.get('/api/stats', async (req, res) => {
    try {
        const users = await query('SELECT COUNT(*) FROM users');
        const groups = await query('SELECT COUNT(*) FROM groups');
        const messages = await query('SELECT COUNT(*) FROM messages');
        const totalUsers = users[0]?.count || 0;
        const totalGroups = groups[0]?.count || 0;
        const totalMessages = messages[0]?.count || 0;
        
        res.json({
            users: totalUsers,
            groups: totalGroups,
            messages: totalMessages,
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
        
        res.json({
            success: true,
            code: pairCode,
            message: 'Use this 8-digit code in WhatsApp to link your device'
        });
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
        res.json({ success: true, message: 'Message sent' });
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
