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

// Resolve a published practice set from frontend category + topic name
// Example:
// /api/practice/resolve/topic?category=aptitude&name=Percentages
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
      .populate("questions")
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

      const questionsInTopic = await Question.countDocuments({
        _id: { $in: questions },
        topic: validTopic._id,
      });

      if (questionsInTopic !== questions.length) {
        return res.status(400).json({
          message:
            "All questions in a practice set must belong to the selected topic",
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

// Update practice set
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { topic, questions } = req.body;

    let selectedTopicId = topic;

    if (topic) {
      const validTopic = await Topic.findById(topic);

      if (!validTopic) {
        return res.status(400).json({
          message: "Invalid topic",
        });
      }

      selectedTopicId = validTopic._id;
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

      if (!selectedTopicId) {
        const existingPracticeSet = await PracticeSet.findById(req.params.id);

        if (!existingPracticeSet) {
          return res.status(404).json({
            message: "Practice set not found",
          });
        }

        selectedTopicId = existingPracticeSet.topic;
      }

      const questionsInTopic = await Question.countDocuments({
        _id: { $in: questions },
        topic: selectedTopicId,
      });

      if (questionsInTopic !== questions.length) {
        return res.status(400).json({
          message:
            "All questions in a practice set must belong to the selected topic",
        });
      }
    }

    // If only the topic is changed, verify existing questions
    // still belong to the new topic.
    if (topic && questions === undefined) {
      const existingPracticeSet = await PracticeSet.findById(req.params.id);

      if (!existingPracticeSet) {
        return res.status(404).json({
          message: "Practice set not found",
        });
      }

      if (existingPracticeSet.questions.length > 0) {
        const questionsInTopic = await Question.countDocuments({
          _id: { $in: existingPracticeSet.questions },
          topic: selectedTopicId,
        });

        if (questionsInTopic !== existingPracticeSet.questions.length) {
          return res.status(400).json({
            message: "Existing questions do not belong to the selected topic",
          });
        }
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
