const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const Topic = require("../models/Topic");
const Question = require("../models/Question");
const PracticeSet = require("../models/PracticeSet");
const { createAuditLog } = require("../services/auditService");

// --------------------------------------------------
// Get topics
//
// Filters:
// ?category=Aptitude
// ?status=published
// ?search=number
// --------------------------------------------------

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, status, search } = req.query;

    const filter = {};

    if (category) {
      filter.category = String(category).trim();
    }

    if (req.user.role === "admin") {
      if (status) {
        filter.status = status;
      }
    } else {
      filter.status = "published";
    }

    if (search) {
      const searchRegex = new RegExp(
        String(search)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const topics = await Topic.find(filter).sort({
      category: 1,
      name: 1,
    });

    res.json(topics);
  } catch (error) {
    console.error("Error fetching topics:", error);

    res.status(500).json({
      message: "Failed to fetch topics",
    });
  }
});

// --------------------------------------------------
// Get single topic
// --------------------------------------------------

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    if (req.user.role !== "admin" && topic.status !== "published") {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    res.json(topic);
  } catch (error) {
    console.error("Error fetching topic:", error);

    res.status(500).json({
      message: "Failed to fetch topic",
    });
  }
});

// --------------------------------------------------
// Create topic - ADMIN ONLY
// --------------------------------------------------

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, description, status } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        message: "Name and category are required",
      });
    }

    const existingTopic = await Topic.findOne({
      name: String(name).trim(),
      category: String(category).trim(),
    });

    if (existingTopic) {
      return res.status(409).json({
        message: "A topic with this name and category already exists",
      });
    }

    const topic = await Topic.create({
      name: String(name).trim(),
      category: String(category).trim(),
      description,
      status: status || "draft",
      createdBy: req.user._id,
    });

    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "topic_management",
      action: "TOPIC_CREATED",

      targetType: "topic",
      targetId: topic._id.toString(),
      targetName: topic.name,

      status: "success",
      ipAddress: req.ip,

      details: `Created topic ${topic.name} with status ${topic.status}`,
    });

    res.status(201).json(topic);
  } catch (error) {
    console.error("Error creating topic:", error);

    res.status(400).json({
      message: "Failed to create topic",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Update topic - ADMIN ONLY
// --------------------------------------------------

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const nextName =
      req.body.name !== undefined ? String(req.body.name).trim() : topic.name;

    const nextCategory =
      req.body.category !== undefined
        ? String(req.body.category).trim()
        : topic.category;

    const duplicate = await Topic.findOne({
      _id: {
        $ne: topic._id,
      },
      name: nextName,
      category: nextCategory,
    });

    if (duplicate) {
      return res.status(409).json({
        message: "A topic with this name and category already exists",
      });
    }

    topic.name = nextName;
    topic.category = nextCategory;

    if (req.body.description !== undefined) {
      topic.description = req.body.description;
    }

    if (req.body.status !== undefined) {
      topic.status = req.body.status;
    }

    await topic.save();

    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "topic_management",
      action: "TOPIC_UPDATED",

      targetType: "topic",
      targetId: topic._id.toString(),
      targetName: topic.name,

      status: "success",
      ipAddress: req.ip,

      details: `Updated topic ${topic.name} with status ${topic.status}`,
    });

    res.json(topic);
  } catch (error) {
    console.error("Error updating topic:", error);

    res.status(400).json({
      message: "Failed to update topic",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Delete topic - ADMIN ONLY
//
// Prevent deletion while questions/practice sets use it.
// --------------------------------------------------

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id);

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const [questionCount, practiceSetCount] = await Promise.all([
      Question.countDocuments({
        topic: topic._id,
      }),
      PracticeSet.countDocuments({
        topic: topic._id,
      }),
    ]);

    if (questionCount > 0 || practiceSetCount > 0) {
      return res.status(409).json({
        message:
          "Cannot delete a topic that is used by questions or practice sets. Unpublish it instead.",
      });
    }

    await topic.deleteOne();

    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "topic_management",
      action: "TOPIC_DELETED",

      targetType: "topic",
      targetId: topic._id.toString(),
      targetName: topic.name,

      status: "success",
      ipAddress: req.ip,

      details: `Deleted topic ${topic.name} from category ${topic.category}`,
    });

    res.json({
      message: "Topic deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting topic:", error);

    res.status(500).json({
      message: "Failed to delete topic",
    });
  }
});

module.exports = router;
