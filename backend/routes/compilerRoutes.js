const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const CompilerRun = require("../models/CompilerRun");
const QuestionActivity = require("../models/QuestionActivity");
const Question = require("../models/Question");
const Topic = require("../models/Topic");
const { getSettingValue } = require("../services/settingsService");
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
    const { language, code, input = "", topicId, questionId } = req.body;

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

    const hasTopicId = Boolean(topicId);
    const hasQuestionId = Boolean(questionId);

    if (hasTopicId !== hasQuestionId) {
      return res.status(400).json({
        message: "Coding practice requires both topic and question IDs.",
      });
    }

    const isPracticeMode = hasTopicId && hasQuestionId;
    let practiceQuestion = null;
    let practiceTopic = null;

    if (isPracticeMode) {
      practiceTopic = await Topic.findOne({
        _id: topicId,
        status: "published",
      }).select("_id");

      if (!practiceTopic) {
        return res.status(404).json({
          message: "Topic not found.",
        });
      }

      practiceQuestion = await Question.findOne({
        _id: questionId,
        topic: practiceTopic._id,
        status: "published",
        type: "coding",
      }).select("_id topic type testCases");

      if (!practiceQuestion) {
        return res.status(404).json({
          message: "Coding question not found.",
        });
      }


    }

    /*
     * Check whether compiler execution is enabled.
     * This happens before contacting the execution provider,
     * so disabled requests do not consume API credits.
     */
    const compilerEnabled = await getSettingValue("compilerEnabled");

    if (!compilerEnabled) {
      return res.status(403).json({
        message: "Compiler is currently disabled by the administrator.",
      });
    }

    if (isPracticeMode) {
      await QuestionActivity.findOneAndUpdate(
        {
          user: req.user._id,
          question: practiceQuestion._id,
        },
        [
          {
            $set: {
              topic: practiceTopic._id,
              type: "coding",
              lastAttemptAt: new Date(),
              isCorrect: {
                $ifNull: ["$isCorrect", false],
              },
            },
          },
        ],
        {
          upsert: true,
          updatePipeline: true,
          returnDocument: "after",
        },
      );
    }
const practiceTestCases =
      isPracticeMode && Array.isArray(practiceQuestion?.testCases)
        ? practiceQuestion.testCases
        : [];

    const executionInput =
      isPracticeMode &&
      !input.trim() &&
      practiceTestCases.length > 0
        ? String(practiceTestCases[0].input || "")
        : input;

    const result = await executeCode({
      language: normalizedLanguage,
      code,
      input: executionInput,
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

    let judging = null;

    if (isPracticeMode) {
      const testCases = Array.isArray(practiceQuestion.testCases)
        ? practiceQuestion.testCases
        : [];

      let passedTests = 0;

      const normalizeOutput = (value) =>
        String(value ?? "")
          .replace(/\r\n/g, "\n")
          .replace(/[ \t]+$/gm, "")
          .trim();

      if (testCases.length > 0) {
        for (const testCase of testCases) {
          const testResult = await executeCode({
            language: normalizedLanguage,
            code,
            input: testCase.input || "",
          });

          if (
            testResult.status === "success" &&
            normalizeOutput(testResult.output) ===
              normalizeOutput(testCase.expectedOutput)
          ) {
            passedTests += 1;
          }
        }
      }

      const allPassed =
        testCases.length > 0 && passedTests === testCases.length;

      await QuestionActivity.findOneAndUpdate(
        {
          user: req.user._id,
          question: practiceQuestion._id,
        },
        [
          {
            $set: {
              topic: practiceTopic._id,
              type: "coding",
              lastAttemptAt: new Date(),
              isCorrect: {
                $or: [
                  { $ifNull: ["$isCorrect", false] },
                  allPassed,
                ],
              },
            },
          },
        ],
        {
          upsert: true,
          updatePipeline: true,
          returnDocument: "after",
        },
      );

      judging = {
        passedTests,
        totalTests: testCases.length,
        allPassed,
      };
    }

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

      ...(judging ? { judging } : {}),
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








