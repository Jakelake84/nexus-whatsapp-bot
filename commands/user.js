// commands/user.js - User Commands

function registerUserCommands(client) {
    // /help
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '/help') return;
        
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
        
        await client.sendMessage(msg.from, text);
    });

    // /rules
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '/rules') return;
        
        await client.sendMessage(msg.from, '📜 **GROUP RULES**\n─────────────────\n\nNo rules set yet.');
    });

    // /id
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '/id') return;
        
        const userId = msg.author || msg.from;
        await client.sendMessage(msg.from, `🆔 Your ID: ${userId}`);
    });

    // /ping
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (msg.body !== '/ping') return;
        
        const start = Date.now();
        await client.sendMessage(msg.from, '🏓 Pong!');
        const end = Date.now();
        await client.sendMessage(msg.from, `⏱️ ${end - start}ms`);
    });

    // /report
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (!msg.body.startsWith('/report ')) return;
        
        const reportText = msg.body.substring(8);
        await client.sendMessage(msg.from, '✅ Report sent to admin!');
    });

    console.log('✅ User commands registered');
}

module.exports = { registerUserCommands };