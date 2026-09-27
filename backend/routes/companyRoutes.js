const express = require("express");
const Company = require("../models/Company");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/* =========================
   GET ALL COMPANIES
   Search + filtering
========================= */
router.get("/", async (req, res) => {
  try {
    const { search, industry, difficulty } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { industry: { $regex: search, $options: "i" } },
        { focusTopics: { $regex: search, $options: "i" } },
      ];
    }

    if (industry) {
      filter.industry = {
        $regex: `^${industry}$`,
        $options: "i",
      };
    }

    if (difficulty) {
      filter.difficulty = {
        $regex: `^${difficulty}$`,
        $options: "i",
      };
    }

    const companies = await Company.find(filter).sort({ name: 1 }).lean();

    res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error.message);

    res.status(500).json({
      message: "Failed to fetch companies",
    });
  }
});

/* =========================
   GET COMPANY BY SLUG
========================= */
router.get("/:slug", async (req, res) => {
  try {
    const company = await Company.findOne({
      slug: req.params.slug,
    }).lean();

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error.message);

    res.status(500).json({
      message: "Failed to fetch company",
    });
  }
});

/* =========================
   CREATE COMPANY
   ADMIN ONLY
========================= */
router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      slug,
      industry,
      website,
      practiceLink,
      status,
      difficulty,
      focusTopics,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        message: "Company name and slug are required",
      });
    }

    const existingCompany = await Company.findOne({
      slug: slug.toLowerCase(),
    });

    if (existingCompany) {
      return res.status(409).json({
        message: "A company with this slug already exists",
      });
    }

    const company = await Company.create({
      name,
      slug,
      industry,
      website,
      practiceLink,
      status,
      difficulty,
      focusTopics,
      createdBy: req.user._id,
    });

    res.status(201).json({
      message: "Company created successfully",
      company,
    });
  } catch (error) {
    console.error("Error creating company:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to create company",
    });
  }
});

/* =========================
   UPDATE COMPANY
   ADMIN ONLY
========================= */
router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allowedUpdates = [
      "name",
      "slug",
      "industry",
      "website",
      "practiceLink",
      "status",
      "difficulty",
      "focusTopics",
    ];

    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.slug) {
      updates.slug = updates.slug.toLowerCase();

      const duplicateCompany = await Company.findOne({
        slug: updates.slug,
        _id: { $ne: req.params.id },
      });

      if (duplicateCompany) {
        return res.status(409).json({
          message: "A company with this slug already exists",
        });
      }
    }

    const company = await Company.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.json({
      message: "Company updated successfully",
      company,
    });
  } catch (error) {
    console.error("Error updating company:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid company ID",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    res.status(500).json({
      message: "Failed to update company",
    });
  }
});

/* =========================
   DELETE COMPANY
   ADMIN ONLY
========================= */
router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    res.json({
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid company ID",
      });
    }

    res.status(500).json({
      message: "Failed to delete company",
    });
  }
});

module.exports = router;
