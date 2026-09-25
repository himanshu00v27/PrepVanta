const express = require("express");
const CompanyQuestion = require("../models/CompanyQuestion");

const router = express.Router();

/* =========================
   GET COMPANY QUESTIONS
========================= */
router.get("/", async (req, res) => {
  try {
    const filter = {};

    if (req.query.company) {
      filter.company = req.query.company;
    }

    if (req.query.section) {
      filter.section = req.query.section;
    }

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.difficulty) {
      filter.difficulty = req.query.difficulty;
    }

    const questions = await CompanyQuestion.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(questions);
  } catch (error) {
    console.error("Error fetching company questions:", error.message);

    res.status(500).json({
      message: "Failed to fetch company questions",
    });
  }
});

/* =========================
   GET QUESTION BY ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const question = await CompanyQuestion.findById(
      req.params.id
    ).lean();

    if (!question) {
      return res.status(404).json({
        message: "Company question not found",
      });
    }

    res.json(question);
  } catch (error) {
    console.error("Error fetching company question:", error.message);

    res.status(500).json({
      message: "Failed to fetch company question",
    });
  }
});

module.exports = router;
