const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const Progress = require("../models/Progress");
require("../models/Topic");

router.get("/", authMiddleware, async (req, res) => {
    try {
        console.log("Progress request user:", req.user);

        const progress = await Progress.find({
            user: req.user.id,
        }).populate("topic");

        console.log("Progress found:", progress);

        res.json(progress);
    } catch (error) {
        console.error("ERROR FETCHING PROGRESS:", error);

        res.status(500).json({
            message: "Failed to fetch progress",
            error: error.message,
        });
    }
});

module.exports = router;