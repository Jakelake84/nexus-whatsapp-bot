// commands/ai.js - Gemini AI Integration
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function askGemini(prompt) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const response = await axios.post(url, {
            contents: [{
                parts: [{ text: prompt }]
            }]
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
        
        return "🤔 I couldn't generate a response. Please try again.";
    } catch (e) {
        return `❌ Connection error: ${e.message}`;
    }
}

function registerAIClient(client) {
    // /ask command
    client.onMessage(async (msg) => {
        if (!msg.body) return;
        if (!msg.body.startsWith('/ask ')) return;
        
        const question = msg.body.substring(5);
        const response = await askGemini(question);
        
        // Split long responses
        if (response.length > 4000) {
            const chunks = response.match(/.{1,4000}/g);
            for (const chunk of chunks) {
                await client.sendMessage(msg.from, `🤖 **AI Response:**\n\n${chunk}`);
            }
        } else {
            await client.sendMessage(msg.from, `🤖 **AI Response:**\n\n${response}`);
        }
    });
}

module.exports = { askGemini, registerAIClient };