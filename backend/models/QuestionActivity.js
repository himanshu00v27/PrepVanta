const mongoose = require("mongoose");

const questionActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
      index: true,
    },

    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["objective", "subjective", "coding"],
      required: true,
    },

    isCorrect: {
      type: Boolean,
      default: false,
    },

    lastAttemptAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

questionActivitySchema.index(
  { user: 1, question: 1 },
  { unique: true }
);

module.exports = mongoose.model("QuestionActivity", questionActivitySchema);
