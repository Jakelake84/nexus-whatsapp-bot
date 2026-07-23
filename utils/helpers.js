// utils/helpers.js
function generatePairCode() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function sanitizePhone(phone) {
    return phone.replace(/[^0-9]/g, '');
}

function formatDate(date) {
    return new Date(date).toLocaleString();
}

function truncate(text, length = 100) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

module.exports = {
    generatePairCode,
    sanitizePhone,
    formatDate,
    truncate
};