const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { createAuditLog } = require("../services/auditService");

const {
  getAllSettings,
  getSettingValue,
  updateSetting,
  updateSettings,
} = require("../services/settingsService");

const router = express.Router();

/* ===================================
   AUDIT HELPER
=================================== */

/*
 * Creates the correct audit information for a
 * platform setting change.
 *
 * Announcement settings are categorized separately
 * under "administrator" because they control the
 * administrator message displayed across PrepVanta.
 */
function getSettingAuditInfo(setting, previousValue) {
  const isAnnouncementSetting =
    setting.key === "announcementEnabled" ||
    setting.key === "announcementMessage";

  let category = "platform_settings";
  let action = "SETTING_UPDATED";
  let targetType = "setting";

  let details =
    `Updated ${setting.key} from ` +
    `${String(previousValue)} to ${String(setting.value)}`;

  if (setting.key === "announcementEnabled") {
    category = "administrator";
    targetType = "announcement";

    action = setting.value ? "ANNOUNCEMENT_ENABLED" : "ANNOUNCEMENT_DISABLED";

    details = setting.value
      ? "Enabled the platform announcement"
      : "Disabled the platform announcement";
  }

  if (setting.key === "announcementMessage") {
    category = "administrator";
    targetType = "announcement";
    action = "ANNOUNCEMENT_MESSAGE_UPDATED";

    /*
     * Do not place the complete announcement text
     * inside the generic audit details field.
     */
    details = "Updated the platform announcement message";
  }

  return {
    category,
    action,
    targetType,
    isAnnouncementSetting,
    details,
  };
}

/* ===================================
   GET PLATFORM SETTINGS
   Admin only
=================================== */

router.get("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const settings = await getAllSettings();

    return res.status(200).json({
      settings,
    });
  } catch (error) {
    console.error("Get platform settings error:", error);

    return res.status(500).json({
      message: "Unable to load platform settings",
    });
  }
});

/* ===================================
   UPDATE MULTIPLE SETTINGS
   Admin only
=================================== */

router.patch("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    /*
     * Capture current values before updating them.
     * This allows us to determine exactly which
     * settings actually changed.
     */
    const currentSettings = await getAllSettings();

    const previousValues = new Map(
      currentSettings.map((setting) => [setting.key, setting.value]),
    );

    /*
     * settingsService validates all supplied values
     * before performing the updates.
     */
    const settings = await updateSettings(req.body, req.user._id);

    /*
     * Create one audit record for every setting
     * whose value actually changed.
     */
    for (const setting of settings) {
      const previousValue = previousValues.get(setting.key);

      if (previousValue === setting.value) {
        continue;
      }

      const auditInfo = getSettingAuditInfo(setting, previousValue);

      await createAuditLog({
        /*
         * Administrator actor snapshot
         */
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        /*
         * Event
         */
        category: auditInfo.category,
        action: auditInfo.action,

        /*
         * Target snapshot
         */
        targetType: auditInfo.targetType,
        targetId: setting.key,
        targetName: setting.key,

        /*
         * Result/context
         */
        status: "success",
        ipAddress: req.ip,
        details: auditInfo.details,
      });
    }

    return res.status(200).json({
      message: "Platform settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Update platform settings error:", error);

    if (
      error.message === "Settings must be provided as an object" ||
      error.message === "No settings were provided" ||
      error.message === "Unknown platform setting" ||
      error.message.includes("must be a boolean") ||
      error.message.includes("must be a string") ||
      error.message.includes("cannot exceed")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update platform settings",
    });
  }
});

/* ===================================
   GET PUBLIC PLATFORM SETTINGS
=================================== */

/*
 * Public endpoint used by the frontend announcement
 * system. Reading public settings does not create
 * audit records.
 */
router.get("/public", async (req, res) => {
  try {
    const announcementEnabled = await getSettingValue("announcementEnabled");

    const announcementMessage = await getSettingValue("announcementMessage");

    return res.status(200).json({
      announcementEnabled,
      announcementMessage: announcementEnabled ? announcementMessage : "",
    });
  } catch (error) {
    console.error("Get public platform settings error:", error);

    return res.status(500).json({
      message: "Unable to load platform information",
    });
  }
});

/* ===================================
   UPDATE ONE SETTING
   Admin only
=================================== */

router.patch("/:key", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!Object.prototype.hasOwnProperty.call(req.body, "value")) {
      return res.status(400).json({
        message: "Setting value is required",
      });
    }

    /*
     * Capture the existing value before updating it.
     */
    const previousValue = await getSettingValue(req.params.key);

    const setting = await updateSetting(
      req.params.key,
      req.body.value,
      req.user._id,
    );

    /*
     * Avoid creating meaningless audit records when
     * the administrator saves the same value again.
     */
    if (previousValue !== setting.value) {
      const auditInfo = getSettingAuditInfo(setting, previousValue);

      await createAuditLog({
        /*
         * Administrator actor snapshot
         */
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        /*
         * Event
         */
        category: auditInfo.category,
        action: auditInfo.action,

        /*
         * Target snapshot
         */
        targetType: auditInfo.targetType,
        targetId: setting.key,
        targetName: setting.key,

        /*
         * Result/context
         */
        status: "success",
        ipAddress: req.ip,
        details: auditInfo.details,
      });
    }

    return res.status(200).json({
      message: "Platform setting updated successfully",
      setting,
    });
  } catch (error) {
    console.error("Update platform setting error:", error);

    if (
      error.message === "Unknown platform setting" ||
      error.message.includes("must be a boolean") ||
      error.message.includes("must be a string") ||
      error.message.includes("cannot exceed")
    ) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update platform setting",
    });
  }
});

module.exports = router;
