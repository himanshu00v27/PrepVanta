const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const Attempt = require("../models/Attempt");
const PracticeSet = require("../models/PracticeSet");
const Question = require("../models/Question");
const Progress = require("../models/Progress");
const QuestionActivity = require("../models/QuestionActivity");

// Start a practice attempt
router.post("/start/:practiceSetId", authMiddleware, async (req, res) => {
    try {
        const practiceSet = await PracticeSet.findById(
            req.params.practiceSetId
        );

        if (!practiceSet) {
            return res.status(404).json({
                message: "Practice set not found"
            });
        }

        const attempt = new Attempt({
            user: req.user._id,
            practiceSet: practiceSet._id,
            totalQuestions: practiceSet.questions.length,
            answers: [],
            status: "in-progress"
        });

        const savedAttempt = await attempt.save();

        res.status(201).json(savedAttempt);
    } catch (error) {
        console.error("Error starting attempt:", error);

        res.status(500).json({
            message: "Failed to start practice attempt"
        });
    }
});

// Get current attempt
// Get user's completed answer history
router.get("/history/all", authMiddleware, async (req, res) => {
    try {
        const attempts = await Attempt.find({
            user: req.user._id,
            status: "completed"
        })
            .populate({
                path: "practiceSet",
                select: "title duration topic",
                populate: {
                    path: "topic",
                    select: "name category"
                }
            })
            .sort({ submittedAt: -1 });

        res.json(attempts);
    } catch (error) {
        console.error("Error fetching answer history:", error);

        res.status(500).json({
            message: "Failed to fetch answer history"
        });
    }
});

// Get dashboard statistics
router.get("/dashboard/stats", authMiddleware, async (req, res) => {
    try {
        const attempts = await Attempt.find({
            user: req.user._id,
            status: "completed"
        })
            .populate({
                path: "practiceSet",
                select: "title topic",
                populate: {
                    path: "topic",
                    select: "name category"
                }
            })
            .populate("answers.question", "difficulty")
            .sort({ submittedAt: -1 })
            .lean();

        const topicPracticeActivities = await QuestionActivity.find({
            user: req.user._id
        })
            .populate("question", "difficulty")
            .lean();

        const attemptedQuestionIds = new Set();
        const correctlySolvedQuestionIds = new Set();

        const difficulty = {
            easy: 0,
            medium: 0,
            hard: 0
        };

        for (const attempt of attempts) {
            for (const item of attempt.answers || []) {
                const userAnswer =
                    typeof item.answer === "string"
                        ? item.answer.trim()
                        : "";

                const questionId = item.question?._id?.toString();

                if (userAnswer && questionId) {
                    attemptedQuestionIds.add(questionId);
                }

                if (
                    item.isCorrect === true &&
                    questionId &&
                    !correctlySolvedQuestionIds.has(questionId) &&
                    ["easy", "medium", "hard"].includes(item.question.difficulty)
                ) {
                    correctlySolvedQuestionIds.add(questionId);
                    difficulty[item.question.difficulty]++;
                }
            }
        }

        for (const activity of topicPracticeActivities) {
            const questionId = activity.question?._id?.toString();

            if (!questionId) {
                continue;
            }

            attemptedQuestionIds.add(questionId);

            if (
                activity.isCorrect === true &&
                !correctlySolvedQuestionIds.has(questionId) &&
                ["easy", "medium", "hard"].includes(activity.question.difficulty)
            ) {
                correctlySolvedQuestionIds.add(questionId);
                difficulty[activity.question.difficulty]++;
            }
        }

        const questionsAttempted = attemptedQuestionIds.size;

        const recentActivity = attempts.slice(0, 5).map((attempt) => ({
            attemptId: attempt._id,
            practiceSetTitle:
                attempt.practiceSet?.title || "Deleted Practice Set",
            topicName:
                attempt.practiceSet?.topic?.name || "Topic unavailable",
            category:
                attempt.practiceSet?.topic?.category || "Category unavailable",
            score: attempt.score || 0,
            totalQuestions: attempt.totalQuestions || 0,
            submittedAt: attempt.submittedAt
        }));

        res.json({
            questionsAttempted,
            practiceSetsAttempted: attempts.length,
            accountStatus: req.user.isActive ? "Active" : "Disabled",
            difficulty,
            recentActivity
        });
    } catch (error) {
        console.error("Error fetching dashboard statistics:", error);

        res.status(500).json({
            message: "Failed to fetch dashboard statistics"
        });
    }
});
router.get("/:id", authMiddleware, async (req, res) => {
    try {
        const attempt = await Attempt.findOne({
            _id: req.params.id,
            user: req.user._id
        })
            .populate("practiceSet")
            .populate("answers.question");

        if (!attempt) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        res.json(attempt);
    } catch (error) {
        console.error("Error fetching attempt:", error);

        res.status(500).json({
            message: "Failed to fetch attempt"
        });
    }
});

// Submit practice attempt
router.post("/:id/submit", authMiddleware, async (req, res) => {
    try {
        const attempt = await Attempt.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!attempt) {
            return res.status(404).json({
                message: "Attempt not found"
            });
        }

        if (attempt.status === "completed") {
            return res.status(400).json({
                message: "Attempt has already been submitted"
            });
        }

        const submittedAnswers = req.body.answers || [];

        let score = 0;

        const processedAnswers = [];

        for (const item of submittedAnswers) {
            const question = await Question.findById(item.questionId);

            if (!question) {
                continue;
            }

            const userAnswer = item.answer || "";

            const correctAnswer = question.answer || "";

            const isCorrect =
                userAnswer.trim().toLowerCase() ===
                correctAnswer.trim().toLowerCase();

            if (isCorrect) {
                score++;
            }

            processedAnswers.push({
                question: question._id,
                answer: userAnswer,
                isCorrect
            });
        }

        attempt.answers = processedAnswers;
        attempt.score = score;
        attempt.status = "completed";
        attempt.submittedAt = new Date();

        const updatedAttempt = await attempt.save();

        // Update topic-wise progress
        for (const item of processedAnswers) {
            const question = await Question.findById(item.question);

            if (!question || !question.topic) {
                continue;
            }

            const progress = await Progress.findOneAndUpdate(
                {
                    user: req.user._id,
                    topic: question.topic
                },
                {
                    $inc: {
                        totalAttempts: 1,
                        totalQuestions: 1,
                        correctAnswers: item.isCorrect ? 1 : 0,
                        incorrectAnswers: item.isCorrect ? 0 : 1,
                        totalScore: item.isCorrect ? 1 : 0
                    },
                    $set: {
                        lastAttemptAt: new Date()
                    }
                },
                {
                    new: true,
                    upsert: true
                }
            );

            progress.averageScore =
                progress.totalQuestions > 0
                    ? Math.round(
                          (progress.correctAnswers /
                              progress.totalQuestions) *
                              100
                      )
                    : 0;

            await progress.save();
        }

        res.json({
            message: "Practice submitted successfully",
            attempt: updatedAttempt
        });
    } catch (error) {
        console.error("Error submitting attempt:", error);

        res.status(500).json({
            message: "Failed to submit practice",
            error: error.message
        });
    }
});

// Get user's attempt history
router.get("/", authMiddleware, async (req, res) => {
    try {
        const attempts = await Attempt.find({
            user: req.user._id
        })
            .populate("practiceSet", "title duration")
            .sort({ createdAt: -1 });

        res.json(attempts);
    } catch (error) {
        console.error("Error fetching attempt history:", error);

        res.status(500).json({
            message: "Failed to fetch attempt history"
        });
    }
});

// Get completed attempt result
router.get("/:id/result", authMiddleware, async (req, res) => {
    try {
        const attempt = await Attempt.findOne({
            _id: req.params.id,
            user: req.user._id,
            status: "completed"
        })
            .populate({
                path: "practiceSet",
                select: "title duration topic",
                populate: {
                    path: "topic",
                    select: "name category"
                }
            })
            .populate(
                "answers.question",
                "title answer"
            );

        if (!attempt) {
            return res.status(404).json({
                message: "Completed attempt not found"
            });
        }

        const percentage =
            attempt.totalQuestions > 0
                ? Math.round(
                      (attempt.score / attempt.totalQuestions) * 100
                  )
                : 0;

        res.json({
            attemptId: attempt._id,
            practiceSet: attempt.practiceSet,
            score: attempt.score,
            totalQuestions: attempt.totalQuestions,
            percentage,
            status: attempt.status,
            startedAt: attempt.startedAt,
            submittedAt: attempt.submittedAt,
            answers: attempt.answers
        });
    } catch (error) {
        console.error("Error fetching result:", error);

        res.status(500).json({
            message: "Failed to fetch result"
        });
    }
});



module.exports = router;







