const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    industry: {
      type: String,
      trim: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },

    hiringRoles: [
      {
        type: String,
        trim: true,
      },
    ],

    eligibility: {
      type: String,
      trim: true,
    },

    packageInfo: {
      type: String,
      trim: true,
    },

    selectionRounds: [
      {
        type: String,
        trim: true,
      },
    ],

    tips: [
      {
        type: String,
        trim: true,
      },
    ],

    focusTopics: [
      {
        type: String,
        trim: true,
      },
    ],

    practiceLink: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    lastVerifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Company", companySchema);