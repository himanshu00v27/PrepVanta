const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const User = require("../models/User");
const Company = require("../models/Company");
const Ticket = require("../models/Ticket");
const CompilerRun = require("../models/CompilerRun");
const AuditLog = require("../models/AuditLog");
const { createAuditLog } = require("../services/auditService");

const router = express.Router();

router.get("/protected", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "You successfully accessed the admin route",
    user: req.user,
  });
});

/* ===================================
   ADMIN DASHBOARD STATISTICS
   GET /api/admin/dashboard
=================================== */
router.get("/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    /*
     * Run independent database queries concurrently
     * so the dashboard only requires one API request.
     */
    const [
      totalUsers,
      activeUsers,
      adminUsers,

      totalCompanies,
      publishedCompanies,

      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,

      totalCompilerRuns,
      successfulCompilerRuns,
      errorCompilerRuns,
      timeoutCompilerRuns,

      recentAuditLogs,
    ] = await Promise.all([
      /* Users */
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: "admin" }),

      /* Companies */
      Company.countDocuments(),
      Company.countDocuments({ status: "published" }),

      /* Support */
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: "open" }),
      Ticket.countDocuments({ status: "in_progress" }),
      Ticket.countDocuments({ status: "resolved" }),
      Ticket.countDocuments({ status: "closed" }),

      /* Compiler */
      CompilerRun.countDocuments(),
      CompilerRun.countDocuments({ status: "success" }),
      CompilerRun.countDocuments({ status: "error" }),
      CompilerRun.countDocuments({ status: "timeout" }),

      /* Audit activity */
      AuditLog.find()
        .select(
          "userId username role category action targetType targetId targetName status ipAddress details createdAt",
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const deactivatedUsers = totalUsers - activeUsers;

    const draftCompanies = totalCompanies - publishedCompanies;

    const failedCompilerRuns = errorCompilerRuns + timeoutCompilerRuns;

    return res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        deactivated: deactivatedUsers,
        admins: adminUsers,
      },

      companies: {
        total: totalCompanies,
        published: publishedCompanies,
        draft: draftCompanies,
      },

      support: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
      },

      compiler: {
        total: totalCompilerRuns,
        successful: successfulCompilerRuns,
        failed: failedCompilerRuns,
        errors: errorCompilerRuns,
        timeouts: timeoutCompilerRuns,
      },

      recentAuditLogs,
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error.message);

    return res.status(500).json({
      message: "Failed to load admin dashboard statistics",
    });
  }
});

/* ===================================
   ADMIN - AUDIT LOGS
   GET /api/admin/audit-logs
=================================== */
router.get("/audit-logs", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      category,
      status,
      role,
      action,
      search,
      sort = "newest",
    } = req.query;

    /*
     * Pagination
     */
    let page = Number.parseInt(req.query.page, 10);
    let limit = Number.parseInt(req.query.limit, 10);

    if (!Number.isInteger(page) || page < 1) {
      page = 1;
    }

    if (!Number.isInteger(limit) || limit < 1) {
      limit = 20;
    }

    /*
     * Prevent extremely large requests.
     */
    limit = Math.min(limit, 100);

    const filter = {};

    /*
     * Category filter
     */
    if (category) {
      filter.category = String(category).trim();
    }

    /*
     * Result filter
     */
    if (status) {
      const normalizedStatus = String(status).trim();

      if (!["success", "failure"].includes(normalizedStatus)) {
        return res.status(400).json({
          message: "Invalid audit status filter",
        });
      }

      filter.status = normalizedStatus;
    }

    /*
     * Actor role filter
     */
    if (role) {
      const normalizedRole = String(role).trim();

      if (!["admin", "user", "system"].includes(normalizedRole)) {
        return res.status(400).json({
          message: "Invalid audit role filter",
        });
      }

      filter.role = normalizedRole;
    }

    /*
     * Action filter
     */
    if (action) {
      filter.action = String(action).trim();
    }
    /*
     * Actor / target / details search
     */
    if (search) {
      const escapedSearch = String(search)
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (escapedSearch) {
        filter.$or = [
          {
            username: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            userId: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            targetId: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            targetName: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            action: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
          {
            details: {
              $regex: escapedSearch,
              $options: "i",
            },
          },
        ];
      }
    }

    const skip = (page - 1) * limit;

    const sortOrder = sort === "oldest" ? 1 : -1;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .select(
          "userId username role category action targetType targetId targetName status ipAddress details createdAt",
        )
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res.json({
      logs,

      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    });
  } catch (error) {
    console.error("Error loading audit logs:", error.message);

    return res.status(500).json({
      message: "Failed to load audit logs",
    });
  }
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

      /*
       * Audit the administrative account-status change.
       *
       * req.user represents the administrator performing the action.
       * targetUser represents the account affected by the action.
       */
      await createAuditLog({
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        category: "user_administration",
        action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",

        targetType: "user",
        targetId: targetUser.userId,
        targetName: targetUser.username,

        status: "success",
        ipAddress: req.ip,

        details: isActive
          ? `Activated user account ${targetUser.username}`
          : `Deactivated user account ${targetUser.username}`,
      });

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
