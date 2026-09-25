const mongoose = require("mongoose");

const interviewQuestionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },

    hint: {
      type: String,
      trim: true,
    },

    tips: [
      {
        type: String,
        trim: true,
      },
    ],

    answerGuidance: {
      type: String,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
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

interviewQuestionSchema.index({
  company: 1,
  category: 1,
});

module.exports = mongoose.model(
  "InterviewQuestion",
  interviewQuestionSchema
);
