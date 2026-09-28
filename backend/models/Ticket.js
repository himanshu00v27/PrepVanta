const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    category: {
      type: String,
      enum: ["technical", "account", "compiler", "company", "other"],
      default: "other",
    },

    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },

        /*
         * Identifies which side of the support conversation
         * produced this message.
         *
         * requester:
         * Sent through the normal Help Desk by the ticket owner.
         *
         * support:
         * Sent by an administrator through Admin Support Management.
         *
         * This is intentionally separate from the sender's account role.
         * An administrator can also be a requester when using Help Desk.
         */
        senderType: {
          type: String,
          enum: ["requester", "support"],
          default: "requester",
          required: true,
        },

        message: {
          type: String,
          required: true,
          trim: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Ticket", ticketSchema);
