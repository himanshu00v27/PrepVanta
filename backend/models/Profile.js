const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    name: {
      type: String,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    education: [
      {
        type: String,
        trim: true,
      },
    ],

    experience: [
      {
        type: String,
        trim: true,
      },
    ],

    projects: [
      {
        type: String,
        trim: true,
      },
    ],

    resumeUrl: {
      type: String,
      trim: true,
    },

    githubUrl: {
      type: String,
      trim: true,
    },

    linkedinUrl: {
      type: String,
      trim: true,
    },

    portfolioUrl: {
      type: String,
      trim: true,
    },

    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Profile", profileSchema);