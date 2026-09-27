const express = require("express");
const Ticket = require("../models/Ticket");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/* ===================================
   CREATE TICKET
   POST /api/support/tickets
=================================== */
router.post("/tickets", authMiddleware, async (req, res) => {
  try {
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

    res.status(201).json({
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

    res.status(500).json({
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

    res.json(tickets);
  } catch (error) {
    console.error("Error fetching tickets:", error.message);

    res.status(500).json({
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

    res.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid ticket ID",
      });
    }

    res.status(500).json({
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

    if (ticket.status === "closed") {
      return res.status(400).json({
        message: "Closed tickets cannot receive new messages",
      });
    }

    ticket.messages.push({
      sender: req.user._id,
      message: message.trim(),
    });

    /*
     * If the user replies to a resolved ticket,
     * reopen it because further assistance is needed.
     */
    if (ticket.status === "resolved") {
      ticket.status = "open";
    }

    ticket.lastActivityAt = new Date();

    await ticket.save();

    res.json({
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

    res.status(500).json({
      message: "Failed to send message",
    });
  }
});

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
      const { status, priority, category } = req.query;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (priority) {
        filter.priority = priority;
      }

      if (category) {
        filter.category = category;
      }

      const tickets = await Ticket.find(filter)
        .populate("user", "userId fullName username email role")
        .sort({ lastActivityAt: -1 })
        .lean();

      res.json(tickets);
    } catch (error) {
      console.error("Error fetching admin tickets:", error.message);

      res.status(500).json({
        message: "Failed to fetch support tickets",
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

      res.json({
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

      res.status(500).json({
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

      ticket.messages.push({
        sender: req.user._id,
        message: message.trim(),
      });

      if (ticket.status === "open") {
        ticket.status = "in_progress";
      }

      ticket.lastActivityAt = new Date();

      await ticket.save();

      res.json({
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

      res.status(500).json({
        message: "Failed to send admin reply",
      });
    }
  },
);

module.exports = router;
