const mongoose = require("mongoose");

const companyQuestionAttemptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyQuestion",
      required: true,
      index: true,
    },

    selectedAnswer: {
      type: String,
      trim: true,
    },

    codeSubmission: {
      type: String,
      trim: true,
    },

    isCorrect: {
      type: Boolean,
    },

    timeTaken: {
      type: Number,
      min: 0,
    },

    attemptedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

companyQuestionAttemptSchema.index({
  user: 1,
  question: 1,
});

module.exports = mongoose.model(
  "CompanyQuestionAttempt",
  companyQuestionAttemptSchema
);
