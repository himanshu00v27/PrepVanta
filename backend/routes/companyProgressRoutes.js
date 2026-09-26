const express = require("express");
const mongoose = require("mongoose");
const CompanyQuestion = require("../models/CompanyQuestion");
const CompanyQuestionAttempt = require("../models/CompanyQuestionAttempt");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* =========================
   GET CURRENT USER PROGRESS
========================= */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = {
      user: req.user._id,
    };

    if (req.query.company) {
      if (!mongoose.Types.ObjectId.isValid(req.query.company)) {
        return res.status(400).json({
          message: "Invalid company ID",
        });
      }
      const companyQuestions = await CompanyQuestion.find({
        company: req.query.company,
      })
        .select("_id")
        .lean();

      const questionIds = companyQuestions.map((question) => question._id);

      filter.question = {
        $in: questionIds,
      };
    }

    const attempts = await CompanyQuestionAttempt.find(filter)
      .populate({
        path: "question",
        select: "-answer -explanation",
      })
      .sort({ attemptedAt: -1 })
      .lean();

    const totalAttempts = attempts.length;

    const correctAttempts = attempts.filter(
      (attempt) => attempt.isCorrect === true,
    ).length;

    const incorrectAttempts = attempts.filter(
      (attempt) => attempt.isCorrect === false,
    ).length;

    const accuracy =
      totalAttempts > 0
        ? Number(((correctAttempts / totalAttempts) * 100).toFixed(2))
        : 0;

    const technicalAttempts = attempts.filter(
      (attempt) => attempt.question?.section === "technical",
    ).length;

    const nonTechnicalAttempts = attempts.filter(
      (attempt) => attempt.question?.section === "non-technical",
    ).length;

    const categoryStats = {};

    for (const attempt of attempts) {
      const category = attempt.question?.category;

      if (!category) {
        continue;
      }

      if (!categoryStats[category]) {
        categoryStats[category] = {
          attempts: 0,
          correct: 0,
          incorrect: 0,
          accuracy: 0,
        };
      }

      categoryStats[category].attempts += 1;

      if (attempt.isCorrect === true) {
        categoryStats[category].correct += 1;
      }

      if (attempt.isCorrect === false) {
        categoryStats[category].incorrect += 1;
      }
    }

    for (const category of Object.keys(categoryStats)) {
      const stats = categoryStats[category];

      stats.accuracy =
        stats.attempts > 0
          ? Number(((stats.correct / stats.attempts) * 100).toFixed(2))
          : 0;
    }

    const recentAttempts = attempts.slice(0, 10);

    res.json({
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      accuracy,
      technicalAttempts,
      nonTechnicalAttempts,
      categoryStats,
      recentAttempts,
    });
  } catch (error) {
    console.error("Error fetching company progress:", error.message);

    res.status(500).json({
      message: "Failed to fetch company progress",
    });
  }
});

module.exports = router;
