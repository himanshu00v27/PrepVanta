const express = require("express");

const Ticket = require("../models/Ticket");
const User = require("../models/User");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { getSettingValue } = require("../services/settingsService");
const { createAuditLog } = require("../services/auditService");

const router = express.Router();

/* ===================================
   CREATE TICKET
   POST /api/support/tickets
=================================== */

router.post("/tickets", authMiddleware, async (req, res) => {
  try {
    const supportEnabled = await getSettingValue("supportEnabled");

    if (!supportEnabled) {
      return res.status(403).json({
        message: "New support ticket submissions are currently disabled.",
      });
    }

    const { subject, description, category, priority } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        message: "Subject and description are required",
      });
    }

    const ticket = await Ticket.create({
      user: req.user._id,
      subject,
      description,
      category: category || "other",
      priority: priority || "medium",
      lastActivityAt: new Date(),
    });

    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "support_management",
      action: "TICKET_CREATED",

      targetType: "ticket",
      targetId: ticket._id.toString(),
      targetName: ticket.subject,

      status: "success",
      ipAddress: req.ip,

      details:
        `Created support ticket "${ticket.subject}" ` +
        `with category ${ticket.category} and priority ${ticket.priority}`,
    });

    return res.status(201).json({
      message: "Support ticket created successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Failed to create support ticket",
    });
  }
});

/* ===================================
   GET CURRENT USER'S TICKETS
   GET /api/support/tickets
=================================== */

router.get("/tickets", authMiddleware, async (req, res) => {
  try {
    const tickets = await Ticket.find({
      user: req.user._id,
    })
      .sort({ lastActivityAt: -1 })
      .lean();

    return res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error.message);

    return res.status(500).json({
      message: "Failed to fetch support tickets",
    });
  }
});

/* ===================================
   GET SINGLE USER TICKET
   GET /api/support/tickets/:id
=================================== */

router.get("/tickets/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate("messages.sender", "userId fullName username role")
      .lean();

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    return res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    return res.status(500).json({
      message: "Failed to fetch support ticket",
    });
  }
});

/* ===================================
   USER SEND MESSAGE
   POST /api/support/tickets/:id/messages
=================================== */

router.post("/tickets/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found",
      });
    }

    if (ticket.status === "resolved" || ticket.status === "closed") {
      return res.status(400).json({
        message: "Resolved or closed tickets cannot receive new messages",
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      senderType: "requester",
      message: message.trim(),
    });

    ticket.lastActivityAt = new Date();

    await ticket.save();

    /*
     * We deliberately do not store the message body
     * in the audit log. The actual conversation is
     * already stored inside the ticket.
     */
    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "support_management",
      action: "USER_TICKET_MESSAGE_SENT",

      targetType: "ticket",
      targetId: ticket._id.toString(),
      targetName: ticket.subject,

      status: "success",
      ipAddress: req.ip,

      details: `User sent a message on support ticket ` + `"${ticket.subject}"`,
    });

    return res.json({
      message: "Message sent successfully",
      ticket,
    });
  } catch (error) {
    console.error("Error sending ticket message:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    return res.status(500).json({
      message: "Failed to send message",
    });
  }
});

/* ===================================
   ADMIN - GET ALL TICKETS
   GET /api/support/admin/tickets
=================================== */

/* ===================================
   ADMIN - GET ALL TICKETS
   GET /api/support/admin/tickets
=================================== */

router.get(
  "/admin/tickets",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status, priority, category, role, search } = req.query;

      const filter = {};

      /* -------------------------------
         BASIC TICKET FILTERS
      -------------------------------- */

      if (status) {
        filter.status = String(status).trim();
      }

      if (priority) {
        filter.priority = String(priority).trim();
      }

      if (category) {
        filter.category = String(category).trim();
      }

      /*
       * Role and text search depend on
       * fields stored in the User model.
       *
       * First find matching users, then
       * restrict tickets to those users.
       */

      let userFilterRequired = false;

      const userFilter = {};

      /* -------------------------------
         REQUESTER ROLE FILTER
      -------------------------------- */

      if (role) {
        const normalizedRole = String(role).trim();

        if (!["user", "admin"].includes(normalizedRole)) {
          return res.status(400).json({
            message: "Invalid requester role",
          });
        }

        userFilter.role = normalizedRole;

        userFilterRequired = true;
      }

      /* -------------------------------
         SEARCH
      -------------------------------- */

      if (search) {
        const escapedSearch = String(search)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        if (escapedSearch) {
          const searchRegex = {
            $regex: escapedSearch,
            $options: "i",
          };

          /*
           * Search ticket fields directly.
           */
          filter.$or = [{ subject: searchRegex }, { description: searchRegex }];

          /*
           * Also search requester identity.
           */
          userFilter.$or = [
            { fullName: searchRegex },
            { username: searchRegex },
            { email: searchRegex },
            { userId: searchRegex },
          ];

          userFilterRequired = true;
        }
      }

      /* -------------------------------
         RESOLVE MATCHING USERS
      -------------------------------- */

      if (userFilterRequired) {
        const matchingUsers = await User.find(userFilter).select("_id").lean();

        const matchingUserIds = matchingUsers.map((account) => account._id);

        /*
         * Search must match either:
         *
         * ticket subject/description
         * OR
         * requester identity.
         *
         * Role filtering, however, must
         * restrict tickets to that role.
         */

        if (search && role) {
          /*
           * When both role + search exist,
           * requester matches already obey
           * the requested role.
           *
           * Subject/description matches must
           * ALSO belong to that role.
           */

          const roleUsers = await User.find({
            role: String(role).trim(),
          })
            .select("_id")
            .lean();

          const roleUserIds = roleUsers.map((account) => account._id);

          const existingSearch = filter.$or;

          delete filter.$or;

          filter.$and = [
            {
              user: {
                $in: roleUserIds,
              },
            },
            {
              $or: [
                ...existingSearch,
                {
                  user: {
                    $in: matchingUserIds,
                  },
                },
              ],
            },
          ];
        } else if (search) {
          /*
           * Search without role:
           * ticket text OR requester identity.
           */

          const existingSearch = filter.$or;

          delete filter.$or;

          filter.$or = [
            ...existingSearch,
            {
              user: {
                $in: matchingUserIds,
              },
            },
          ];
        } else if (role) {
          /*
           * Role only.
           */

          filter.user = {
            $in: matchingUserIds,
          };
        }
      }

      /* -------------------------------
         FETCH TICKETS
      -------------------------------- */

      const tickets = await Ticket.find(filter)
        .populate("user", "userId fullName username email role")
        .sort({
          lastActivityAt: -1,
        })
        .lean();

      return res.json(tickets);
    } catch (error) {
      console.error("Error fetching admin tickets:", error.message);

      return res.status(500).json({
        message: "Failed to fetch support tickets",
      });
    }
  },
);

/* ===================================
   ADMIN - GET SINGLE TICKET
   GET /api/support/admin/tickets/:id
=================================== */

router.get(
  "/admin/tickets/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.params.id)
        .populate("user", "userId fullName username email role")
        .populate("messages.sender", "userId fullName username role")
        .lean();

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      return res.json(ticket);
    } catch (error) {
      console.error("Error fetching admin ticket:", error.message);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid ticket ID",
        });
      }

      return res.status(500).json({
        message: "Failed to fetch support ticket",
      });
    }
  },
);

/* ===================================
   ADMIN - UPDATE TICKET STATUS
   PATCH /api/support/admin/tickets/:id/status
=================================== */

router.patch(
  "/admin/tickets/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { status } = req.body;

      const allowedStatuses = ["open", "in_progress", "resolved", "closed"];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid ticket status",
        });
      }

      /*
       * Capture the current ticket before changing it.
       * This lets the audit record include the actual
       * old -> new status transition.
       */
      const previousTicket = await Ticket.findById(req.params.id).lean();

      if (!previousTicket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      /*
       * Avoid an unnecessary database update and audit
       * event when the status is already the requested
       * value.
       */
      if (previousTicket.status === status) {
        return res.json({
          message: "Ticket status is already up to date",
          ticket: previousTicket,
        });
      }

      const ticket = await Ticket.findByIdAndUpdate(
        req.params.id,
        {
          status,
          lastActivityAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      let action = "TICKET_STATUS_CHANGED";

      if (status === "resolved") {
        action = "TICKET_RESOLVED";
      } else if (status === "closed") {
        action = "TICKET_CLOSED";
      }

      await createAuditLog({
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        category: "support_management",
        action,

        targetType: "ticket",
        targetId: ticket._id.toString(),
        targetName: ticket.subject,

        status: "success",
        ipAddress: req.ip,

        details:
          `Changed support ticket status from ` +
          `${previousTicket.status} to ${ticket.status}`,
      });

      return res.json({
        message: "Ticket status updated successfully",
        ticket,
      });
    } catch (error) {
      console.error("Error updating ticket status:", error.message);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid ticket ID",
        });
      }

      return res.status(500).json({
        message: "Failed to update ticket status",
      });
    }
  },
);

/* ===================================
   ADMIN - SEND MESSAGE
   POST /api/support/admin/tickets/:id/messages
=================================== */

router.post(
  "/admin/tickets/:id/messages",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          message: "Message is required",
        });
      }

      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({
          message: "Ticket not found",
        });
      }

      if (ticket.status === "closed") {
        return res.status(400).json({
          message: "Closed tickets cannot receive new messages",
        });
      }

      const previousStatus = ticket.status;

      ticket.messages.push({
        sender: req.user._id,
        senderType: "support",
        message: message.trim(),
      });

      /*
       * Preserve the existing behavior:
       * the first administrator response moves an
       * open ticket into in_progress.
       */
      if (ticket.status === "open") {
        ticket.status = "in_progress";
      }

      ticket.lastActivityAt = new Date();

      await ticket.save();

      /*
       * Audit the administrator reply.
       *
       * The actual message body remains in the ticket
       * and is intentionally not duplicated into the
       * audit log.
       */
      await createAuditLog({
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        category: "support_management",
        action: "ADMIN_TICKET_MESSAGE_SENT",

        targetType: "ticket",
        targetId: ticket._id.toString(),
        targetName: ticket.subject,

        status: "success",
        ipAddress: req.ip,

        details:
          `Administrator sent a message on support ticket ` +
          `"${ticket.subject}"`,
      });

      /*
       * The admin reply can also automatically cause
       * an open -> in_progress transition.
       *
       * Record that separately so status-history
       * filtering remains complete.
       */
      if (previousStatus === "open" && ticket.status === "in_progress") {
        await createAuditLog({
          userId: req.user.userId,
          username: req.user.username,
          role: req.user.role,

          category: "support_management",
          action: "TICKET_STATUS_CHANGED",

          targetType: "ticket",
          targetId: ticket._id.toString(),
          targetName: ticket.subject,

          status: "success",
          ipAddress: req.ip,

          details:
            "Changed support ticket status from open " +
            "to in_progress automatically after administrator reply",
        });
      }

      return res.json({
        message: "Admin reply sent successfully",
        ticket,
      });
    } catch (error) {
      console.error("Error sending admin reply:", error.message);

      if (error.name === "CastError") {
        return res.status(400).json({
          message: "Invalid ticket ID",
        });
      }

      return res.status(500).json({
        message: "Failed to send admin reply",
      });
    }
  },
);

module.exports = router;
