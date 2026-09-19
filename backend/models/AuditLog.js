const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            default: null
        },

        username: {
            type: String,
            default: null
        },

        action: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ['success', 'failure'],
            required: true
        },

        ipAddress: {
            type: String,
            default: null
        },

        details: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);