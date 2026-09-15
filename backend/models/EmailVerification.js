const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true
        },

        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },

        password: {
            type: String,
            required: true
        },

        otpHash: {
            type: String,
            required: true
        },

        otpExpiresAt: {
            type: Date,
            required: true
        },

        otpAttempts: {
            type: Number,
            default: 0
        },

        verified: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    'EmailVerification',
    emailVerificationSchema
);