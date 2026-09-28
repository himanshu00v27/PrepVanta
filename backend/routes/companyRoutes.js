const express = require("express");

const Company = require("../models/Company");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const { createAuditLog } = require("../services/auditService");

const router = express.Router();

/* =========================
   GET ALL COMPANIES
   Search + filtering
========================= */

router.get("/", async (req, res) => {
  try {
    const { search, industry, difficulty } = req.query;

    const filter = {
      status: "published",
    };

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

    return res.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error.message);

    return res.status(500).json({
      message: "Failed to fetch companies",
    });
  }
});

/* =========================
   GET ALL COMPANIES
   ADMIN ONLY
   Includes draft + published
========================= */

router.get("/admin/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { search, industry, difficulty, status } = req.query;

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

    if (status) {
      filter.status = status;
    }

    const companies = await Company.find(filter).sort({ name: 1 }).lean();

    return res.json(companies);
  } catch (error) {
    console.error("Admin company list error:", error.message);

    return res.status(500).json({
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
      status: "published",
    }).lean();

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    return res.json(company);
  } catch (error) {
    console.error("Error fetching company:", error.message);

    return res.status(500).json({
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

    const normalizedSlug = String(slug).trim().toLowerCase();

    const existingCompany = await Company.findOne({
      slug: normalizedSlug,
    });

    if (existingCompany) {
      return res.status(409).json({
        message: "A company with this slug already exists",
      });
    }

    const company = await Company.create({
      name,
      slug: normalizedSlug,
      industry,
      website,
      practiceLink,
      status,
      difficulty,
      focusTopics,
      createdBy: req.user._id,
    });

    /*
     * Audit successful company creation.
     */
    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "company_management",
      action: "COMPANY_CREATED",

      targetType: "company",
      targetId: company._id.toString(),
      targetName: company.name,

      status: "success",
      ipAddress: req.ip,

      details:
        `Created company ${company.name} ` + `with status ${company.status}`,
    });

    return res.status(201).json({
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

    return res.status(500).json({
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
      updates.slug = String(updates.slug).trim().toLowerCase();

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

    /*
     * Capture the company before modification.
     *
     * This is required so we can distinguish:
     * draft -> published
     * published -> draft
     * ordinary company updates
     */
    const previousCompany = await Company.findById(req.params.id).lean();

    if (!previousCompany) {
      return res.status(404).json({
        message: "Company not found",
      });
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

    /*
     * Determine the most meaningful audit action.
     */
    let action = "COMPANY_UPDATED";
    let details = `Updated company ${company.name}`;

    if (
      previousCompany.status !== "published" &&
      company.status === "published"
    ) {
      action = "COMPANY_PUBLISHED";
      details = `Published company ${company.name}`;
    } else if (
      previousCompany.status === "published" &&
      company.status !== "published"
    ) {
      action = "COMPANY_UNPUBLISHED";
      details = `Unpublished company ${company.name}`;
    }

    /*
     * Determine which fields were actually changed.
     */
    const changedFields = [];

    for (const field of allowedUpdates) {
      if (updates[field] === undefined) {
        continue;
      }

      const oldValue = previousCompany[field];
      const newValue = company[field];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(field);
      }
    }

    /*
     * Only create an audit record if something
     * actually changed.
     */
    if (changedFields.length > 0) {
      if (action === "COMPANY_UPDATED") {
        details =
          `Updated company ${company.name}. ` +
          `Changed fields: ${changedFields.join(", ")}`;
      }

      await createAuditLog({
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,

        category: "company_management",
        action,

        targetType: "company",
        targetId: company._id.toString(),
        targetName: company.name,

        status: "success",
        ipAddress: req.ip,

        details,
      });
    }

    return res.json({
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

    return res.status(500).json({
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
    /*
     * findByIdAndDelete returns the deleted document.
     *
     * This is important because it gives us the
     * company's snapshot for the audit record even
     * though the database record has been removed.
     */
    const company = await Company.findByIdAndDelete(req.params.id);

    if (!company) {
      return res.status(404).json({
        message: "Company not found",
      });
    }

    await createAuditLog({
      userId: req.user.userId,
      username: req.user.username,
      role: req.user.role,

      category: "company_management",
      action: "COMPANY_DELETED",

      targetType: "company",
      targetId: company._id.toString(),
      targetName: company.name,

      status: "success",
      ipAddress: req.ip,

      details: `Deleted company ${company.name} ` + `(slug: ${company.slug})`,
    });

    return res.json({
      message: "Company deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting company:", error.message);

    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid company ID",
      });
    }

    return res.status(500).json({
      message: "Failed to delete company",
    });
  }
});

module.exports = router;
