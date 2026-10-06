const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        topic: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Topic",
            required: true,
        },

        totalAttempts: {
            type: Number,
            default: 0,
        },

        totalQuestions: {
            type: Number,
            default: 0,
        },

        correctAnswers: {
            type: Number,
            default: 0,
        },

        incorrectAnswers: {
            type: Number,
            default: 0,
        },

        totalScore: {
            type: Number,
            default: 0,
        },

        averageScore: {
            type: Number,
            default: 0,
        },

        lastAttemptAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Progress", progressSchema);