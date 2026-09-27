const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getSettingValue } = require("../services/settingsService");

/*
 * Routes that must remain available during maintenance.
 *
 * Health:
 *   Allows server monitoring.
 *
 * Login:
 *   Allows administrators to authenticate.
 *
 * Settings:
 *   Allows an authenticated administrator to disable
 *   maintenance mode again.
 */
const PUBLIC_EXEMPT_PATHS = ["/api/health", "/api/auth/login"];

async function maintenanceMiddleware(req, res, next) {
  try {
    const maintenanceMode = await getSettingValue("maintenanceMode");

    /*
     * Normal operation.
     */
    if (!maintenanceMode) {
      return next();
    }

    /*
     * Always allow health check and login.
     */
    if (PUBLIC_EXEMPT_PATHS.includes(req.path)) {
      return next();
    }

    /*
     * During maintenance, inspect an existing JWT if one
     * was supplied. This does not replace authMiddleware.
     */
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({
          userId: decoded.userId,
        })
          .select("role isActive")
          .lean();

        /*
         * Administrators retain access during maintenance.
         */
        if (user && user.isActive && user.role === "admin") {
          return next();
        }
      } catch (error) {
        /*
         * Invalid/expired tokens simply continue to the
         * maintenance response below.
         */
      }
    }

    return res.status(503).json({
      message:
        "PrepVanta is currently undergoing maintenance. Please try again later.",
      maintenanceMode: true,
    });
  } catch (error) {
    console.error("Maintenance middleware error:", error);

    /*
     * Fail open if the setting cannot be read.
     * A database/settings problem should not accidentally
     * lock everyone out of PrepVanta.
     */
    return next();
  }
}

module.exports = maintenanceMiddleware;
