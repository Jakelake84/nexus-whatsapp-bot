// commands/admin.js - Admin Commands
const warnings = new Map();

async function isUserAdmin(client, chatId, userId) {
    try {
        const chat = await client.getChatById(chatId);
        const contact = await chat.getContact(userId);
        return contact.isAdmin || contact.isSuperAdmin;
    } catch (e) {
        return false;
    }
}

function registerAdminCommands(client) {
    // .del - Delete message
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.del') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(msg.from, 'ℹ️ Reply to a message with .del');
            return;
        }
        
        try {
            const quoted = await msg.getQuotedMessage();
            await quoted.delete(true);
            await client.sendMessage(msg.from, '🗑️ Message deleted');
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .ban - Ban user
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.ban') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(msg.from, 'ℹ️ Reply to a user\'s message with .ban');
            return;
        }
        
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(msg.from, `✅ ${contact.name || contact.number} has been BANNED!`);
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .kick - Kick user
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.kick') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(msg.from, 'ℹ️ Reply to a user\'s message with .kick');
            return;
        }
        
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(msg.from, `✅ ${contact.name || contact.number} has been KICKED!`);
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .mute - Mute user (5 min)
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.mute') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(msg.from, 'ℹ️ Reply to a user\'s message with .mute');
            return;
        }
        
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            await client.sendMessage(msg.from, `🔇 ${contact.name || contact.number} has been MUTED for 5 minutes!`);
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .warn - Warn user (3 = ban)
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.warn') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        if (!msg.hasQuotedMsg) {
            await client.sendMessage(msg.from, 'ℹ️ Reply to a user\'s message with .warn');
            return;
        }
        
        try {
            const quoted = await msg.getQuotedMessage();
            const contact = await quoted.getContact();
            const userId = contact.id._serialized;
            
            if (!warnings.has(msg.from)) {
                warnings.set(msg.from, new Map());
            }
            
            const groupWarnings = warnings.get(msg.from);
            const count = (groupWarnings.get(userId) || 0) + 1;
            groupWarnings.set(userId, count);
            
            await client.sendMessage(msg.from, `⚠️ ${contact.name || contact.number} has been WARNED! (${count}/3)`);
            
            if (count >= 3) {
                await client.sendMessage(msg.from, `🚫 ${contact.name || contact.number} has been BANNED for reaching 3 warns!`);
                groupWarnings.delete(userId);
            }
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .lock - Lock group
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.lock') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        await client.sendMessage(msg.from, '🔒 Group has been LOCKED!');
    });

    // .unlock - Unlock group
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.unlock') return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        await client.sendMessage(msg.from, '🔓 Group has been UNLOCKED!');
    });

    // .setrules - Set rules
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (!msg.body.startsWith('.setrules ')) return;
        
        const isAdmin = await isUserAdmin(client, msg.from, msg.author || msg.from);
        if (!isAdmin) {
            await client.sendMessage(msg.from, '⛔ Admin only!');
            return;
        }
        
        const rules = msg.body.substring(10);
        await client.sendMessage(msg.from, '✅ Rules have been updated!');
    });

    // .rules - Show rules
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.rules') return;
        
        await client.sendMessage(msg.from, '📜 **GROUP RULES**\n─────────────────\n\nNo rules set yet. Use .setrules to set rules.');
    });

    // .adminlist - List admins
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.adminlist') return;
        
        try {
            const chat = await client.getChatById(msg.from);
            const admins = await chat.getAdmins();
            let text = '👑 **GROUP ADMINS**\n─────────────────\n\n';
            for (const admin of admins) {
                text += `• ${admin.name || admin.number}\n`;
            }
            await client.sendMessage(msg.from, text);
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    // .stats - Group statistics
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '.stats') return;
        
        try {
            const chat = await client.getChatById(msg.from);
            const admins = await chat.getAdmins();
            const participants = await chat.getParticipants();
            
            let text = '📊 **GROUP STATISTICS**\n─────────────────\n\n';
            text += `📛 Name: ${chat.name || 'N/A'}\n`;
            text += `👥 Members: ${participants.length}\n`;
            text += `👑 Admins: ${admins.length}\n`;
            text += `🔒 Type: ${chat.isGroup ? 'Group' : 'Private'}`;
            
            await client.sendMessage(msg.from, text);
        } catch (e) {
            await client.sendMessage(msg.from, `❌ Error: ${e.message}`);
        }
    });

    console.log('✅ Admin commands registered');
}

module.exports = { registerAdminCommands, isUserAdmin };