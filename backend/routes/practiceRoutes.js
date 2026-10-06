const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const PracticeSet = require("../models/PracticeSet");
const Question = require("../models/Question");
const Topic = require("../models/Topic");

// Get all published practice sets
router.get("/", authMiddleware, async (req, res) => {
  try {
    const practiceSets = await PracticeSet.find({
      status: "published",
    })
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

// Get single practice set
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

    res.json(practiceSet);
  } catch (error) {
    console.error("Error fetching practice set:", error);

    res.status(500).json({
      message: "Failed to fetch practice set",
    });
  }
});

// Create practice set
router.post("/", authMiddleware, async (req, res) => {
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

    if (questions && questions.length > 0) {
      const validQuestions = await Question.countDocuments({
        _id: { $in: questions },
      });

      if (validQuestions !== questions.length) {
        return res.status(400).json({
          message: "One or more questions are invalid",
        });
      }
    }

    const practiceSet = new PracticeSet({
      title,
      description,
      topic,
      questions: questions || [],
      duration,
      status: status || "draft",
      createdBy: req.user._id,
    });

    const savedPracticeSet = await practiceSet.save();

    res.status(201).json(savedPracticeSet);
  } catch (error) {
    console.error("Error creating practice set:", error);

    res.status(400).json({
      message: "Failed to create practice set",
      error: error.message,
    });
  }
});

// Update practice set
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { questions } = req.body;

    if (questions && questions.length > 0) {
      const validQuestions = await Question.countDocuments({
        _id: { $in: questions },
      });

      if (validQuestions !== questions.length) {
        return res.status(400).json({
          message: "One or more questions are invalid",
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
    );

    if (!practiceSet) {
      return res.status(404).json({
        message: "Practice set not found",
      });
    }

    res.json(practiceSet);
  } catch (error) {
    console.error("Error updating practice set:", error);

    res.status(400).json({
      message: "Failed to update practice set",
      error: error.message,
    });
  }
});

// Delete practice set
router.delete("/:id", authMiddleware, async (req, res) => {
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
