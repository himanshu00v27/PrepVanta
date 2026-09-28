const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    /*
     * Actor snapshot
     * Stores who performed the action at the time it occurred.
     * These values remain in the audit record even if the
     * user's account later changes.
     */
    userId: {
      type: String,
      default: null,
      index: true,
    },

    username: {
      type: String,
      default: null,
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "system"],
      default: "user",
    },

    /*
     * Audit category
     */
    category: {
      type: String,
      enum: [
        "authentication",
        "registration",
        "password_recovery",
        "user_administration",
        "platform_settings",
        "company_management",
        "support_management",
        "administrator",
      ],
      default: null,
      index: true,
    },

    /*
     * Specific action performed.
     * Examples:
     * LOGIN
     * USER_DEACTIVATED
     * SETTING_UPDATED
     * ANNOUNCEMENT_PUBLISHED
     */
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    /*
     * Target snapshot
     * Used when the action affects another object/user.
     */
    targetType: {
      type: String,
      default: null,
      trim: true,
    },

    targetId: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },

    targetName: {
      type: String,
      default: null,
      trim: true,
    },

    /*
     * Result of the operation
     */
    status: {
      type: String,
      enum: ["success", "failure"],
      required: true,
      index: true,
    },

    ipAddress: {
      type: String,
      default: null,
    },

    details: {
      type: String,
      default: null,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Useful compound indexes for the future
 * Audit Logs admin page.
 */
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ status: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
