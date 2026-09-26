const express = require("express");

const InterviewQuestion = require("../models/InterviewQuestion");

const router = express.Router();

/* =========================
   GET INTERVIEW QUESTIONS
========================= */

router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.company) {
      filter.company = req.query.company;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    const questions = await InterviewQuestion.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(questions);
  } catch (error) {
    console.error("Error fetching interview questions:", error.message);

    res.status(500).json({
      message: "Failed to fetch interview questions",
    });
  }
});

/* =========================
   GET INTERVIEW QUESTION BY ID
========================= */

router.get("/:id", async (req, res) => {
  try {
    const question = await InterviewQuestion.findById(req.params.id).lean();

    if (!question) {
      return res.status(404).json({
        message: "Interview question not found",
      });
    }

    res.json(question);
  } catch (error) {
    console.error("Error fetching interview question:", error.message);

    res.status(500).json({
      message: "Failed to fetch interview question",
    });
  }
});

module.exports = router;
