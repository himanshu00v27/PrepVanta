const AuditLog = require('../models/AuditLog');

async function createAuditLog({
    userId = null,
    username = null,
    action,
    status,
    ipAddress = null,
    details = null
}) {
    try {
        await AuditLog.create({
            userId,
            username,
            action,
            status,
            ipAddress,
            details
        });
    } catch (error) {
        console.error(
            'Audit log error:',
            error.message
        );
    }
}

module.exports = {
    createAuditLog
};