const express = require("express");
const CompanyQuestion = require("../models/CompanyQuestion");
const CompanyQuestionAttempt = require("../models/CompanyQuestionAttempt");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   SUBMIT COMPANY QUESTION ATTEMPT
========================= */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      question,
      selectedAnswer,
      codeSubmission,
      timeTaken,
    } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Question is required",
      });
    }

    const companyQuestion = await CompanyQuestion.findById(question).lean();

    if (!companyQuestion) {
      return res.status(404).json({
        message: "Company question not found",
      });
    }

    if (
      selectedAnswer === undefined &&
      codeSubmission === undefined
    ) {
      return res.status(400).json({
        message: "Selected answer or code submission is required",
      });
    }

    if (
      timeTaken !== undefined &&
      (typeof timeTaken !== "number" || timeTaken < 0)
    ) {
      return res.status(400).json({
        message: "timeTaken must be a non-negative number",
      });
    }

    let isCorrect;

    if (companyQuestion.format === "mcq") {
      if (selectedAnswer === undefined) {
        return res.status(400).json({
          message: "Selected answer is required for an MCQ",
        });
      }

      isCorrect = selectedAnswer === companyQuestion.answer;
    }

    const attempt = await CompanyQuestionAttempt.create({
      user: req.user._id,
      question: companyQuestion._id,
      selectedAnswer,
      codeSubmission,
      isCorrect,
      timeTaken,
    });

    res.status(201).json(attempt);
  } catch (error) {
    console.error("Error creating company question attempt:", error.message);

    res.status(500).json({
      message: "Failed to submit company question attempt",
    });
  }
});

/* =========================
   GET CURRENT USER ATTEMPTS
========================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = {
      user: req.user._id,
    };

    if (req.query.question) {
      filter.question = req.query.question;
    }

    const attempts = await CompanyQuestionAttempt.find(filter)
      .populate({
        path: "question",
        select: "-answer -explanation",
      })
      .sort({ attemptedAt: -1 })
      .lean();

    res.json(attempts);
  } catch (error) {
    console.error("Error fetching company question attempts:", error.message);

    res.status(500).json({
      message: "Failed to fetch company question attempts",
    });
  }
});

/* =========================
   GET CURRENT USER ATTEMPT BY ID
========================= */
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const attempt = await CompanyQuestionAttempt.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate({
        path: "question",
        select: "-answer -explanation",
      })
      .lean();

    if (!attempt) {
      return res.status(404).json({
        message: "Company question attempt not found",
      });
    }

    res.json(attempt);
  } catch (error) {
    console.error("Error fetching company question attempt:", error.message);

    res.status(500).json({
      message: "Failed to fetch company question attempt",
    });
  }
});

module.exports = router;
