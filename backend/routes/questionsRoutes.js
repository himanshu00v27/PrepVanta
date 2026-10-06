const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const Question = require("../models/Question");
const Topic = require("../models/Topic");
const PracticeSet = require("../models/PracticeSet");

// --------------------------------------------------
// Get questions
// Supports:
// ?category=Aptitude
// ?topic=<topicId>
// ?difficulty=easy
// ?type=objective
// ?status=published
// ?search=percentage
// --------------------------------------------------

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { category, topic, difficulty, type, status, search } = req.query;

    const filter = {};

    if (category) {
      filter.category = String(category).trim();
    }

    if (topic) {
      filter.topic = topic;
    }

    if (difficulty) {
      filter.difficulty = String(difficulty).trim().toLowerCase();
    }

    if (type) {
      filter.type = String(type).trim().toLowerCase();
    }

    // Normal users may only see published questions.
    // Admins may filter by draft/published or see all.
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

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { explanation: searchRegex },
      ];
    }

    const questions = await Question.find(filter)
      .populate("topic")
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);

    res.status(500).json({
      message: "Failed to fetch questions",
    });
  }
});

// --------------------------------------------------
// Get single question
// --------------------------------------------------

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).populate("topic");

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    if (req.user.role !== "admin" && question.status !== "published") {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    res.json(question);
  } catch (error) {
    console.error("Error fetching question:", error);

    res.status(500).json({
      message: "Failed to fetch question",
    });
  }
});

// --------------------------------------------------
// Create question - ADMIN ONLY
// --------------------------------------------------

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      topic,
      difficulty,
      options,
      answer,
      explanation,
      solution,
      status,
    } = req.body;

    if (!title || !type || !category || !topic || !difficulty) {
      return res.status(400).json({
        message: "Title, type, category, topic and difficulty are required",
      });
    }

    const validTopic = await Topic.findById(topic);

    if (!validTopic) {
      return res.status(400).json({
        message: "Invalid topic",
      });
    }

    if (validTopic.category !== category) {
      return res.status(400).json({
        message: "Question category must match the selected topic category",
      });
    }

    if (
      type === "objective" &&
      (!Array.isArray(options) || options.length < 2)
    ) {
      return res.status(400).json({
        message: "Objective questions require at least two options",
      });
    }

    if (type === "objective" && !answer) {
      return res.status(400).json({
        message: "Objective questions require a correct answer",
      });
    }

    const question = new Question({
      title,
      description,
      type,
      category,
      topic,
      difficulty,
      options: options || [],
      answer,
      explanation,
      solution,
      status: status || "draft",
      createdBy: req.user._id,
    });

    const savedQuestion = await question.save();

    const populatedQuestion = await Question.findById(
      savedQuestion._id,
    ).populate("topic");

    res.status(201).json(populatedQuestion);
  } catch (error) {
    console.error("Error creating question:", error);

    res.status(400).json({
      message: "Failed to create question",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Update question - ADMIN ONLY
// --------------------------------------------------

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const existingQuestion = await Question.findById(req.params.id);

    if (!existingQuestion) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const selectedTopicId = req.body.topic || existingQuestion.topic;

    const selectedCategory = req.body.category || existingQuestion.category;

    const selectedType = req.body.type || existingQuestion.type;

    const selectedOptions =
      req.body.options !== undefined
        ? req.body.options
        : existingQuestion.options;

    const selectedAnswer =
      req.body.answer !== undefined ? req.body.answer : existingQuestion.answer;

    const validTopic = await Topic.findById(selectedTopicId);

    if (!validTopic) {
      return res.status(400).json({
        message: "Invalid topic",
      });
    }

    if (validTopic.category !== selectedCategory) {
      return res.status(400).json({
        message: "Question category must match the selected topic category",
      });
    }

    if (
      selectedType === "objective" &&
      (!Array.isArray(selectedOptions) || selectedOptions.length < 2)
    ) {
      return res.status(400).json({
        message: "Objective questions require at least two options",
      });
    }

    if (selectedType === "objective" && !selectedAnswer) {
      return res.status(400).json({
        message: "Objective questions require a correct answer",
      });
    }

    const question = await Question.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("topic");

    res.json(question);
  } catch (error) {
    console.error("Error updating question:", error);

    res.status(400).json({
      message: "Failed to update question",
      error: error.message,
    });
  }
});

// --------------------------------------------------
// Delete question - ADMIN ONLY
// --------------------------------------------------
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        message: "Question not found",
      });
    }

    const linkedPracticeSet = await PracticeSet.findOne({
      questions: question._id,
    }).select("_id title");

    if (linkedPracticeSet) {
      return res.status(409).json({
        message: `Cannot delete this question because it is used in the practice set "${linkedPracticeSet.title}". Remove it from the practice set first.`,
      });
    }

    await Question.findByIdAndDelete(question._id);

    res.json({
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);

    res.status(500).json({
      message: "Failed to delete question",
    });
  }
});

module.exports = router;
