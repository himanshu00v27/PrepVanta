const AuditLog = require("../models/AuditLog");

/*
 * Creates an audit record.
 *
 * Audit logging should never cause the main application
 * operation to fail. If writing an audit record fails,
 * the error is recorded in the server console.
 */
async function createAuditLog({
  userId = null,
  username = null,
  role = "user",

  category = null,
  action,

  targetType = null,
  targetId = null,
  targetName = null,

  status,
  ipAddress = null,
  details = null,
}) {
  try {
    await AuditLog.create({
      /*
       * Actor snapshot
       */
      userId,
      username,
      role,

      /*
       * Event
       */
      category,
      action,

      /*
       * Target snapshot
       */
      targetType,
      targetId,
      targetName,

      /*
       * Result/context
       */
      status,
      ipAddress,
      details,
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}

module.exports = {
  createAuditLog,
};
