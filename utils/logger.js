// utils/logger.js
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs.txt');

function log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] [${type}] ${message}\n`;
    console.log(entry.trim());
    
    try {
        fs.appendFileSync(LOG_FILE, entry);
    } catch (e) {}
}

function logError(message, error) {
    log(`${message}: ${error.message}`, 'ERROR');
    if (error.stack) {
        log(error.stack, 'ERROR');
    }
}

module.exports = { log, logError };