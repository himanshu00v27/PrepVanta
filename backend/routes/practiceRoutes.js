const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const PracticeSet = require("../models/PracticeSet");
const Question = require("../models/Question");
const Topic = require("../models/Topic");

// --------------------------------------------------
// Get practice sets
// Normal users: published only
// Admins: may request ?status=draft / published
// --------------------------------------------------

router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = {};

    if (req.user.role === "admin") {
      if (req.query.status) {
        filter.status = req.query.status;
      }
    } else {
      filter.status = "published";
    }

    if (req.query.topic) {
      filter.topic = req.query.topic;
    }

    const practiceSets = await PracticeSet.find(filter)
      .populate("questions")
      .populate("topic")
      .sort({ createdAt: -1 });

    res.json(practiceSets);
  } catch (error) {
    console.error("Error fetching practice sets:", error);

    res.status(500).json({
      message: "Failed to fetch practice sets",
    });
  }
});

// --------------------------------------------------
// Resolve practice set using frontend category + topic
// Example:
// /api/practice/resolve/topic?category=aptitude&name=Percentages
// --------------------------------------------------

router.get("/resolve/topic", authMiddleware, async (req, res) => {
  try {
    const { category, name } = req.query;

    if (!category || !name) {
      return res.status(400).json({
        message: "Category and topic name are required",
      });
    }

    const categoryMap = {
      aptitude: "Aptitude",
      reasoning: "Reasoning",
      topics: "Technical",
    };

    const categoryKey = String(category).trim().toLowerCase();

    const dbCategory = categoryMap[categoryKey] || String(category).trim();

    const topic = await Topic.findOne({
      name: String(name).trim(),
      category: dbCategory,
      status: "published",
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const practiceSet = await PracticeSet.findOne({
      topic: topic._id,
      status: "published",
    })
      .populate({
        path: "questions",
        match: {
          status: "published",
        },
      })
      .populate("topic");

    if (!practiceSet) {
      return res.status(404).json({
        message: `No published practice set available for ${topic.name}`,
      });
    }

    res.json(practiceSet);
  } catch (error) {
    console.error("Resolve practice set error:", error);

    res.status(500).json({
      message: "Failed to resolve practice set",
    });
  }
});

// --------------------------------------------------
// Get learner-safe practice set listing
// --------------------------------------------------

router.get("/learner/list", authMiddleware, async (req, res) => {
  try {
    const practiceSets = await PracticeSet.find({
      status: "published",
    })
      .select("title description topic questions duration createdAt")
      .populate({
        path: "topic",
        select: "name category description status",
        match: {
          status: "published",
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    const learnerPracticeSets = practiceSets
      .filter((practiceSet) => practiceSet.topic)
      .map((practiceSet) => ({
        _id: practiceSet._id,
        title: practiceSet.title,
        description: practiceSet.description || "",
        topic: practiceSet.topic,
        duration: practiceSet.duration,
        questionCount: Array.isArray(practiceSet.questions)
          ? practiceSet.questions.length
          : 0,
        createdAt: practiceSet.createdAt,
      }));

    res.json(learnerPracticeSets);
  } catch (error) {
    console.error("Error fetching learner practice sets:", error);

    res.status(500).json({
      message: "Failed to fetch practice sets",
    });
  }
});
// --------------------------------------------------
// Get single practice set
// --------------------------------------------------

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const practiceSet = await PracticeSet.findById(req.params.id)
      .populate("questions")
      .populate("topic");

    if (!practiceSet) {
      return res.status(404).json({
        message: "Practice set not found",
      });
    }

    if (req.user.role !== "admin" && practiceSet.status !== "published") {
      return res.status(404).json({
        message: "Practice set not found",
      });
    }

    res.json(practiceSet);
  } catch (error) {
    console.error("Error fetching practice set:", error);

    res.status(500).json({
      message: "Failed to fetch practice set",
    });
  }
});

// --------------------------------------------------
// Create practice set - ADMIN ONLY
// --------------------------------------------------

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, topic, questions, duration, status } = req.body;

    if (!title || !topic || !duration) {
      return res.status(400).json({
        message: "Title, topic and duration are required",
      });
    }

    const validTopic = await Topic.findById(topic);

    if (!validTopic) {
      return res.status(400).json({
        message: "Invalid topic",
      });
    }

    const questionIds = Array.isArray(questions) ? questions : [];

    if (questionIds.length > 0) {
      const validQuestions = await Question.find({
        _id: {
          $in: questionIds,
        },
      }).select("_id topic");

      if (validQuestions.length !== questionIds.length) {
        return res.status(400).json({
          message: "One or more questions are invalid",
        });
      }

      const hasWrongTopic = validQuestions.some(
        (question) => String(question.topic) !== String(validTopic._id),
      );

      if (hasWrongTopic) {
        return res.status(400).json({
          message:
            "All questions in a practice set must belong to the selected topic",
        });
      }
    }

    const practiceSet = new PracticeSet({
      title,
      description,
      topic: validTopic._id,
      questions: questionIds,
      duration,
      status: status || "draft",
      createdBy: req.user._id,
    });

    const savedPracticeSet = await practiceSet.save();

    const populatedPracticeSet = await PracticeSet.findById(
      savedPracticeSet._id,
    )
      .populate("questions")
      .populate("topic");

    res.status(201).json(populatedPracticeSet);
  } catch (error) {
    console.error("Error creating practice set:", error);

    res.status(400).json({
      message: "Failed to create practice set",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Update practice set - ADMIN ONLY
// --------------------------------------------------

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existingPracticeSet = await PracticeSet.findById(req.params.id);

    if (!existingPracticeSet) {
      return res.status(404).json({
        message: "Practice set not found",
      });
    }

    const selectedTopicId = req.body.topic || existingPracticeSet.topic;

    const validTopic = await Topic.findById(selectedTopicId);

    if (!validTopic) {
      return res.status(400).json({
        message: "Invalid topic",
      });
    }

    const selectedQuestions =
      req.body.questions !== undefined
        ? req.body.questions
        : existingPracticeSet.questions;

    if (!Array.isArray(selectedQuestions)) {
      return res.status(400).json({
        message: "Questions must be an array",
      });
    }

    if (selectedQuestions.length > 0) {
      const validQuestions = await Question.find({
        _id: {
          $in: selectedQuestions,
        },
      }).select("_id topic");

      if (validQuestions.length !== selectedQuestions.length) {
        return res.status(400).json({
          message: "One or more questions are invalid",
        });
      }

      const hasWrongTopic = validQuestions.some(
        (question) => String(question.topic) !== String(validTopic._id),
      );

      if (hasWrongTopic) {
        return res.status(400).json({
          message:
            "All questions in a practice set must belong to the selected topic",
        });
      }
    }

    const practiceSet = await PracticeSet.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("questions")
      .populate("topic");

    res.json(practiceSet);
  } catch (error) {
    console.error("Error updating practice set:", error);

    res.status(400).json({
      message: "Failed to update practice set",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Delete practice set - ADMIN ONLY
// --------------------------------------------------

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const practiceSet = await PracticeSet.findByIdAndDelete(req.params.id);

    if (!practiceSet) {
      return res.status(404).json({
        message: "Practice set not found",
      });
    }

    res.json({
      message: "Practice set deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting practice set:", error);

    res.status(500).json({
      message: "Failed to delete practice set",
    });
  }
});

module.exports = router;

