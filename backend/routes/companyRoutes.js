const express = require("express");
const Company = require("../models/Company");

const router = express.Router();

/* =========================
   GET ALL COMPANIES
========================= */
router.get("/", async (req, res) => {
  try {
    const companies = await Company.find()
      .sort({ name: 1 })
      .lean();

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

module.exports = router;
