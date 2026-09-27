const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const {
  getAllSettings,
  getSettingValue,
  updateSetting,
  updateSettings,
} = require("../services/settingsService");

const router = express.Router();

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
    const settings = await updateSettings(req.body, req.user._id);

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

    const setting = await updateSetting(
      req.params.key,
      req.body.value,
      req.user._id,
    );

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
