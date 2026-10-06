const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const Question = require("../models/Question");

// Get all questions
router.get("/", authMiddleware, async (req, res) => {
    try {
        const questions = await Question.find()
            .populate("topic")
            .sort({ createdAt: -1 });

        res.json(questions);
    } catch (error) {
        console.error("Error fetching questions:", error);

        res.status(500).json({
            message: "Failed to fetch questions"
        });
    }
});

// Get single question
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const question = await Question.findById(req.params.id)
            .populate("topic");

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        res.json(question);
    } catch (error) {
        console.error("Error fetching question:", error);

        res.status(500).json({
            message: "Failed to fetch question"
        });
    }
});

// Create question
router.post("/", authMiddleware, async (req, res) => {
    try {
        const question = new Question({
            ...req.body,
            createdBy: req.user._id
        });

        const savedQuestion = await question.save();

        res.status(201).json(savedQuestion);
    } catch (error) {
        console.error("Error creating question:", error);

        res.status(400).json({
            message: "Failed to create question",
            error: error.message
        });
    }
});

// Update question
router.put("/:id", authMiddleware, async (req, res) => {
    try {
        const question = await Question.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        res.json(question);
    } catch (error) {
        console.error("Error updating question:", error);

        res.status(400).json({
            message: "Failed to update question",
            error: error.message
        });
    }
});

// Delete question
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const question = await Question.findByIdAndDelete(req.params.id);

        if (!question) {
            return res.status(404).json({
                message: "Question not found"
            });
        }

        res.json({
            message: "Question deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting question:", error);

        res.status(500).json({
            message: "Failed to delete question"
        });
    }
});

module.exports = router;