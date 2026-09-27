const express = require("express");
const User = require("../models/User");
const Profile = require("../models/Profile");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/* ===================================
   SEARCH USERS
   GET /api/users/search?q=
=================================== */

router.get("/search", authMiddleware, async (req, res) => {
  try {
    const q = (req.query.q || "").trim();

    if (!q) {
      return res.json([]);
    }

    if (q.length < 2) {
      return res.status(400).json({
        message: "Search must contain at least 2 characters",
      });
    }

    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escapedQuery, "i");

    const users = await User.find({
      isActive: true,
      role: "user",
      $or: [
        { fullName: searchRegex },
        { username: searchRegex },
        { userId: searchRegex },
      ],
    })
      .select("_id fullName username userId")
      .limit(20)
      .lean();

    if (!users.length) {
      return res.json([]);
    }

    const userIds = users.map((user) => user._id);

    const profiles = await Profile.find({
      user: { $in: userIds },
    })
      .select("user name bio skills")
      .lean();

    const profileMap = new Map(
      profiles.map((profile) => [profile.user.toString(), profile]),
    );

    const results = users
      .filter((user) => {
        const profile = profileMap.get(user._id.toString());

        /*
         * A user without a Profile is still searchable.
         * A user with a Profile is searchable only when it is public.
         */
        return !profile || profile.isPublic !== false;
      })
      .map((user) => {
        const profile = profileMap.get(user._id.toString());

        return {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          userId: user.userId,
          name: profile?.name || user.fullName,
          bio: profile?.bio || "",
          skills: profile?.skills || [],
        };
      });

    res.json(results);
  } catch (error) {
    console.error("Error searching users:", error.message);

    res.status(500).json({
      message: "Failed to search users",
    });
  }
});

/* ===================================
   GET PUBLIC USER PROFILE
   GET /api/users/:userId
=================================== */

router.get("/:userId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({
      userId: req.params.userId,
      isActive: true,
      role: "user",
    })
      .select("_id fullName username userId")
      .lean();

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const profile = await Profile.findOne({
      user: user._id,
    }).lean();

    if (profile && profile.isPublic === false) {
      return res.status(403).json({
        message: "This profile is private",
      });
    }

    res.json({
      user: {
        fullName: user.fullName,
        username: user.username,
        userId: user.userId,
      },

      profile: profile
        ? {
            name: profile.name || user.fullName,
            bio: profile.bio || "",
            skills: profile.skills || [],
            education: profile.education || [],
            experience: profile.experience || [],
            projects: profile.projects || [],
            resumeUrl: profile.resumeUrl || "",
            githubUrl: profile.githubUrl || "",
            linkedinUrl: profile.linkedinUrl || "",
            portfolioUrl: profile.portfolioUrl || "",
          }
        : {
            name: user.fullName,
            bio: "",
            skills: [],
            education: [],
            experience: [],
            projects: [],
            resumeUrl: "",
            githubUrl: "",
            linkedinUrl: "",
            portfolioUrl: "",
          },
    });
  } catch (error) {
    console.error("Error loading user profile:", error.message);

    res.status(500).json({
      message: "Failed to load user profile",
    });
  }
});

module.exports = router;
