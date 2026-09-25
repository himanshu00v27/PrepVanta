const mongoose = require("mongoose");

const companyQuestionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    section: {
      type: String,
      enum: ["technical", "non-technical"],
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["mcq", "coding", "aptitude", "reasoning"],
      required: true,
      trim: true,
    },

    topic: {
      type: String,
      trim: true,
    },

    format: {
      type: String,
      enum: ["mcq", "coding"],
      required: true,
      trim: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    options: [
      {
        type: String,
        trim: true,
      },
    ],

    answer: {
      type: String,
      trim: true,
    },

    explanation: {
      type: String,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
    },

    codingDetails: {
      type: mongoose.Schema.Types.Mixed,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

companyQuestionSchema.index({
  company: 1,
  section: 1,
  category: 1,
});

module.exports = mongoose.model("CompanyQuestion", companyQuestionSchema);
