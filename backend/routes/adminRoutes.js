const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const User = require("../models/User");

const router = express.Router();

router.get("/protected", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "You successfully accessed the admin route",
    user: req.user,
  });
});

/* ===================================
   ADMIN - LIST / SEARCH USERS
   GET /api/admin/users
=================================== */
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    const filter = {};

    if (query) {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { fullName: { $regex: escapedQuery, $options: "i" } },
        { username: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
        { userId: { $regex: escapedQuery, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select(
        "fullName username email userId role isActive createdAt updatedAt",
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error loading admin users:", error.message);

    res.status(500).json({
      message: "Failed to load users",
    });
  }
});

/* ===================================
   ADMIN - UPDATE USER ACTIVE STATUS
   PATCH /api/admin/users/:id/status
=================================== */
router.patch(
  "/users/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be a boolean",
        });
      }

      const targetUser = await User.findById(req.params.id);

      if (!targetUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      /*
       * Prevent an administrator from accidentally
       * deactivating their own account.
       */
      if (
        targetUser._id.toString() === req.user._id.toString() &&
        isActive === false
      ) {
        return res.status(400).json({
          message: "You cannot deactivate your own admin account",
        });
      }

      targetUser.isActive = isActive;

      await targetUser.save();

      res.json({
        message: isActive
          ? "User account activated successfully"
          : "User account deactivated successfully",

        user: {
          _id: targetUser._id,
          fullName: targetUser.fullName,
          username: targetUser.username,
          email: targetUser.email,
          userId: targetUser.userId,
          role: targetUser.role,
          isActive: targetUser.isActive,
          updatedAt: targetUser.updatedAt,
        },
      });
    } catch (error) {
      console.error("Error updating user active status:", error.message);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid user ID",
        });
      }

      res.status(500).json({
        message: "Failed to update user account status",
      });
    }
  },
);

module.exports = router;
