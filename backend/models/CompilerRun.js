const mongoose = require("mongoose");

const compilerRunSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    language: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
    },

    input: {
      type: String,
      default: "",
    },

    output: {
      type: String,
      default: "",
    },

    error: {
      type: String,
      default: "",
    },

    status: {
      type: String,
      enum: ["success", "error", "timeout"],
      required: true,
    },

    executionTime: {
      type: Number,
      default: 0,
    },

    memoryUsed: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CompilerRun", compilerRunSchema);