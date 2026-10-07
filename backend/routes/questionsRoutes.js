const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const Question = require("../models/Question");
const Topic = require("../models/Topic");
const PracticeSet = require("../models/PracticeSet");
const QuestionActivity = require("../models/QuestionActivity");

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
// Get learner-safe questions for topic practice
// --------------------------------------------------

router.get("/topic-practice/:topicId", authMiddleware, async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.topicId,
      status: "published",
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const questions = await Question.find({
      topic: topic._id,
      status: "published",
    })
      .select(
        "title description type category topic difficulty options.text status",
      )
      .sort({ createdAt: -1 });

    res.json({
      topic,
      questions,
    });
  } catch (error) {
    console.error("Error fetching topic practice questions:", error);

    res.status(500).json({
      message: "Failed to fetch topic practice questions",
    });
  }
});
// --------------------------------------------------
// Check objective answers for topic practice
// --------------------------------------------------

router.post("/topic-practice/:topicId/check", authMiddleware, async (req, res) => {
  try {
    const topic = await Topic.findOne({
      _id: req.params.topicId,
      status: "published",
    });

    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const submittedAnswers = Array.isArray(req.body.answers)
      ? req.body.answers
      : [];

    const questionIds = submittedAnswers
      .map((item) => item.questionId)
      .filter(Boolean);

    const questions = await Question.find({
      _id: { $in: questionIds },
      topic: topic._id,
      status: "published",
      type: "objective",
    });

    const questionMap = new Map(
      questions.map((question) => [String(question._id), question]),
    );

    const results = submittedAnswers.map((item) => {
      const question = questionMap.get(String(item.questionId));

      if (!question) {
        return {
          questionId: item.questionId,
          valid: false,
        };
      }

      const userAnswer = String(item.answer || "").trim();
      const correctAnswer = String(question.answer || "").trim();

      const isCorrect =
        userAnswer.toLowerCase() === correctAnswer.toLowerCase();

      return {
        questionId: String(question._id),
        valid: true,
        isCorrect,
        correctAnswer,
        explanation: question.explanation || "",
        solution: question.solution || "",
      };
    });

    const activityOperations = results
      .map((result, index) => ({
        result,
        submitted: submittedAnswers[index],
      }))
      .filter(
        ({ result, submitted }) =>
          result.valid &&
          String(submitted?.answer || "").trim()
      )
      .map(({ result }) => ({
        updateOne: {
          filter: {
            user: req.user._id,
            question: result.questionId,
          },
          update: [
            {
              $set: {
                topic: topic._id,
                type: "objective",
                lastAttemptAt: new Date(),
                isCorrect: {
                  $or: [
                    { $ifNull: ["$isCorrect", false] },
                    result.isCorrect === true,
                  ],
                },
              },
            },
          ],
          upsert: true,
          updatePipeline: true,
        },
      }));

    if (activityOperations.length > 0) {
      await QuestionActivity.bulkWrite(activityOperations);
    }

    res.json({
      results,
    });
  } catch (error) {
    console.error("Error checking topic practice answers:", error);

    res.status(500).json({
      message: "Failed to check topic practice answers",
    });
  }
});
// --------------------------------------------------
// Reveal subjective answer for topic practice
// --------------------------------------------------

router.get(
  "/topic-practice/:topicId/subjective/:questionId/answer",
  authMiddleware,
  async (req, res) => {
    try {
      const topic = await Topic.findOne({
        _id: req.params.topicId,
        status: "published",
      });

      if (!topic) {
        return res.status(404).json({
          message: "Topic not found",
        });
      }

      const question = await Question.findOne({
        _id: req.params.questionId,
        topic: topic._id,
        status: "published",
        type: "subjective",
      }).select("answer explanation solution");

      if (!question) {
        return res.status(404).json({
          message: "Subjective question not found",
        });
      }

      res.json({
        questionId: String(question._id),
        answer: question.answer || "",
        explanation: question.explanation || "",
        solution: question.solution || "",
      });
    } catch (error) {
      console.error("Error revealing subjective answer:", error);

      res.status(500).json({
        message: "Failed to reveal subjective answer",
      });
    }
  },
);
// --------------------------------------------------
// Get coding question for topic practice
// --------------------------------------------------

router.get(
  "/topic-practice/:topicId/coding/:questionId",
  authMiddleware,
  async (req, res) => {
    try {
      const topic = await Topic.findOne({
        _id: req.params.topicId,
        status: "published",
      }).select("name category description status");

      if (!topic) {
        return res.status(404).json({
          message: "Topic not found",
        });
      }

      const question = await Question.findOne({
        _id: req.params.questionId,
        topic: topic._id,
        status: "published",
        type: "coding",
      }).select("title description type difficulty");

      if (!question) {
        return res.status(404).json({
          message: "Coding question not found",
        });
      }

      res.json({
        question: {
          _id: question._id,
          title: question.title,
          description: question.description || "",
          type: question.type,
          difficulty: question.difficulty,
        },
        topic: {
          _id: topic._id,
          name: topic.name,
          category: topic.category,
        },
      });
    } catch (error) {
      console.error("Error fetching coding practice question:", error);

      res.status(500).json({
        message: "Failed to fetch coding practice question",
      });
    }
  },
);
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

    if (req.user.role === "admin") {
      return res.json(question);
    }

    const learnerQuestion = question.toObject();

    delete learnerQuestion.answer;
    delete learnerQuestion.explanation;
    delete learnerQuestion.solution;
    delete learnerQuestion.testCases;

    if (Array.isArray(learnerQuestion.options)) {
      learnerQuestion.options = learnerQuestion.options.map((option) => ({
        _id: option._id,
        text: option.text,
      }));
    }

    res.json(learnerQuestion);
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
      testCases,
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

    if (type === "coding") {
      if (!Array.isArray(testCases) || testCases.length === 0) {
        return res.status(400).json({
          message: "Coding questions require at least one test case",
        });
      }

      const invalidTestCase = testCases.some(
        (testCase) =>
          !testCase ||
          typeof testCase.expectedOutput !== "string" ||
          !testCase.expectedOutput.trim(),
      );

      if (invalidTestCase) {
        return res.status(400).json({
          message: "Every coding test case requires an expected output",
        });
      }
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
      testCases: type === "coding" ? testCases : [],
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

    const selectedTestCases =
      req.body.testCases !== undefined
        ? req.body.testCases
        : existingQuestion.testCases;

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

    if (selectedType === "coding") {
      if (!Array.isArray(selectedTestCases) || selectedTestCases.length === 0) {
        return res.status(400).json({
          message: "Coding questions require at least one test case",
        });
      }

      const invalidTestCase = selectedTestCases.some(
        (testCase) =>
          !testCase ||
          typeof testCase.expectedOutput !== "string" ||
          !testCase.expectedOutput.trim(),
      );

      if (invalidTestCase) {
        return res.status(400).json({
          message: "Every coding test case requires an expected output",
        });
      }
    }

    const updateData = {
      ...req.body,
      testCases: selectedType === "coding" ? selectedTestCases : [],
    };

    const question = await Question.findByIdAndUpdate(req.params.id, updateData, {
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









