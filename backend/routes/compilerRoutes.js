const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const CompilerRun = require("../models/CompilerRun");
const {
  executeCode,
  getSupportedLanguages,
} = require("../services/compilerService");

const router = express.Router();

const MAX_CODE_LENGTH = 50000;
const MAX_INPUT_LENGTH = 10000;

/*
 * GET /api/compiler/languages
 * Returns the languages supported by PrepVanta's compiler.
 */
router.get("/languages", authMiddleware, (req, res) => {
  return res.json({
    languages: getSupportedLanguages(),
  });
});

/*
 * POST /api/compiler/run
 * Executes code and stores the execution in CompilerRun.
 */
router.post("/run", authMiddleware, async (req, res) => {
  try {
    const { language, code, input = "" } = req.body;

    if (!language || typeof language !== "string") {
      return res.status(400).json({
        message: "Language is required.",
      });
    }

    const normalizedLanguage = language.trim().toLowerCase();

    if (!getSupportedLanguages().includes(normalizedLanguage)) {
      return res.status(400).json({
        message: "Unsupported programming language.",
      });
    }

    if (!code || typeof code !== "string" || !code.trim()) {
      return res.status(400).json({
        message: "Code is required.",
      });
    }

    if (code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({
        message: `Code must not exceed ${MAX_CODE_LENGTH} characters.`,
      });
    }

    if (typeof input !== "string") {
      return res.status(400).json({
        message: "Input must be text.",
      });
    }

    if (input.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({
        message: `Input must not exceed ${MAX_INPUT_LENGTH} characters.`,
      });
    }

    const result = await executeCode({
      language: normalizedLanguage,
      code,
      input,
    });

    const compilerRun = await CompilerRun.create({
      user: req.user._id,
      language: normalizedLanguage,
      code,
      input,
      output: result.output,
      error: result.error,
      status: result.status,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
    });

    return res.status(200).json({
      message:
        result.status === "success"
          ? "Code executed successfully."
          : "Code execution completed with an error.",

      run: {
        id: compilerRun._id,
        language: compilerRun.language,
        output: compilerRun.output,
        error: compilerRun.error,
        status: compilerRun.status,
        executionTime: compilerRun.executionTime,
        memoryUsed: compilerRun.memoryUsed,
        createdAt: compilerRun.createdAt,
      },
    });
  } catch (error) {
    console.error("Compiler execution error:", error);

    const statusCode =
      Number.isInteger(error.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode < 600
        ? error.statusCode
        : 500;

    return res.status(statusCode).json({
      message: statusCode === 500 ? "Unable to execute code." : error.message,
    });
  }
});

module.exports = router;
