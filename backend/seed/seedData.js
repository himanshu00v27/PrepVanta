require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Company = require("../models/Company");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");
const CompanyQuestion = require("../models/CompanyQuestion");
const InterviewQuestion = require("../models/InterviewQuestion");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/prepvanta";

async function seedDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected");

    // -----------------------------
    // 1. Create demo user
    // -----------------------------
    let demoUser = await User.findOne({
      username: "demo_user",
    });

    if (!demoUser) {
      const hashedPassword = await bcrypt.hash("Demo@12345", 10);

      demoUser = await User.create({
        fullName: "PrepVanta Demo User",
        username: "demo_user",
        email: "demo@prepvanta.local",
        password: hashedPassword,
        userId: "DEMO-USER-001",
        role: "user",
        isActive: true,
      });

      console.log("Demo user created");
    } else {
      console.log("Demo user already exists");
    }

    // -----------------------------
    // 2. Create demo company
    // -----------------------------
    const company = await Company.findOneAndUpdate(
      { slug: "prepvanta-tech" },
      {
        name: "PrepVanta Technologies",
        slug: "prepvanta-tech",
        industry: "Technology",
        website: "https://example.com",
        practiceLink: "/company.html?company=prepvanta-tech",
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Company ready: ${company.name}`);
    // -----------------------------
    // 3. Create demo company questions
    // -----------------------------
    const companyQuestions = [
      {
        company: company._id,
        section: "technical",
        category: "programming",
        topic: "JavaScript",
        format: "mcq",
        questionId: "CQ-000001",
        question: "Which keyword is used to declare a block-scoped variable in JavaScript?",
        options: ["var", "let", "define", "variable"],
        answer: "let",
        explanation:
          "The let keyword declares a block-scoped variable in JavaScript.",
        difficulty: "easy",
        tags: ["javascript", "basics"],
      },
      {
        company: company._id,
        section: "technical",
        category: "database",
        topic: "DBMS",
        format: "mcq",
        questionId: "CQ-000002",
        question: "Which normal form removes partial dependency in a relational database?",
        options: ["First Normal Form", "Second Normal Form", "Third Normal Form", "BCNF"],
        answer: "Second Normal Form",
        explanation:
          "Second Normal Form removes partial dependency on a composite candidate key.",
        difficulty: "medium",
        tags: ["dbms", "normalization"],
      },
      {
        company: company._id,
        questionId: "CQ-000003",
        section: "technical",
        category: "programming",
        topic: "Arrays",
        format: "coding",
        question:
          "Write a program to find the largest element in an array of integers.",
        answer:
          "Traverse the array while maintaining the maximum value encountered.",
        explanation:
          "Initialize the maximum with the first element and update it whenever a larger element is found.",
        difficulty: "easy",
        codingDetails: {
          input: "An integer array",
          output: "The largest integer in the array",
        },
        tags: ["arrays", "algorithms"],
      },
      {
        company: company._id,
        questionId: "CQ-000004",
        section: "non-technical",
        category: "aptitude",
        topic: "Percentages",
        format: "mcq",
        question:
          "A product costs rupees800 and is sold at a 15% profit. What is the selling price?",
        options: ["rupees900", "rupees920", "rupees940", "rupees960"],
        answer: "rupees920",
        explanation:
          "15% of rupees800 is rupees120, so the selling price is rupees800 + rupees120 = rupees920.",
        difficulty: "easy",
        tags: ["aptitude", "percentages"],
      },
      {
        company: company._id,
        section: "non-technical",
        category: "reasoning",
        topic: "Number Series",
        format: "mcq",
        questionId: "CQ-000005",
        question: "What is the next number in the series: 2, 6, 12, 20, 30, ?",
        options: ["36", "40", "42", "44"],
        answer: "42",
        explanation:
          "The differences are 4, 6, 8, 10, so the next difference is 12. Therefore, 30 + 12 = 42.",
        difficulty: "medium",
        tags: ["reasoning", "number-series"],
      },
      {
        company: company._id,
        questionId: "CQ-000006",
        section: "non-technical",
        category: "communication",
        topic: "Communication",
        format: "mcq",
        question:
          "Which approach is generally most effective when answering a behavioral interview question?",
        options: [
          "Give only a one-word answer",
          "Use a clear situation, action, and result structure",
          "Avoid describing your own contribution",
          "Discuss unrelated technical details",
        ],
        answer: "Use a clear situation, action, and result structure",
        explanation:
          "A structured response helps communicate the context, your actions, and the outcome clearly.",
        difficulty: "easy",
        tags: ["communication", "interview"],
      },
    ];

    for (const questionData of companyQuestions) {
      await CompanyQuestion.findOneAndUpdate(
        {
          questionId: questionData.questionId,
        },
        questionData,
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log(
      `Company questions ready: ${companyQuestions.length}`
    );


    // -----------------------------
    // 4. Create demo interview questions
    // -----------------------------
    const interviewQuestions = [
      {
        company: company._id,
        category: "technical",
        question: "Tell me about a technical project you have worked on.",
        hint: "Choose a project where you made a meaningful contribution.",
        tips: [
          "Briefly explain the project and its purpose.",
          "Clearly describe your own contribution.",
          "Mention the technologies or tools you used.",
          "End with the outcome or what you learned.",
        ],
        answerGuidance:
          "Structure your answer around the project context, your specific contribution, the technologies used, challenges faced, and the final result.",
        difficulty: "medium",
        tags: ["technical", "project", "experience"],
      },
      {
        company: company._id,
        category: "general",
        question: "Why do you want to work for this company?",
        hint: "Connect your interests and skills with the company's work.",
        tips: [
          "Research the company's products or services.",
          "Mention specific aspects that interest you.",
          "Connect the role with your skills and career goals.",
        ],
        answerGuidance:
          "Give a specific answer based on the company's work, the role, your relevant skills, and what you hope to learn or contribute.",
        difficulty: "easy",
        tags: ["general", "motivation", "company"],
      },
      {
        company: company._id,
        category: "behavioral",
        question: "Tell me about a challenge you faced and how you handled it.",
        hint: "Use a real example from a project, college activity, internship, or other relevant experience.",
        tips: [
          "Briefly describe the situation.",
          "Explain the specific action you took.",
          "Describe the result.",
          "Mention what you learned from the experience.",
        ],
        answerGuidance:
          "Use a clear situation, action, and result structure. Focus on your own actions rather than only describing what the team did.",
        difficulty: "medium",
        tags: ["behavioral", "problem-solving", "communication"],
      },
    ];

    for (const interviewQuestionData of interviewQuestions) {
      await InterviewQuestion.findOneAndUpdate(
        {
          company: interviewQuestionData.company,
          question: interviewQuestionData.question,
        },
        interviewQuestionData,
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log(
      `Interview questions ready: ${interviewQuestions.length}`
    );

    // -----------------------------
    // 5. Create platform setting
    // -----------------------------
    const setting = await Setting.findOneAndUpdate(
      { key: "platform_name" },
      {
        key: "platform_name",
        value: "PrepVanta",
        description: "Name of the placement preparation platform.",
        updatedBy: demoUser._id,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Setting ready: ${setting.key}`);

    // -----------------------------
    // 6. Create demo help-desk ticket
    // -----------------------------
    const ticket = await Ticket.findOneAndUpdate(
      {
        user: demoUser._id,
        subject: "Demo support ticket",
      },
      {
        user: demoUser._id,
        subject: "Demo support ticket",
        description:
          "This is a demo Help Desk ticket created during the S-04 seed process.",
        status: "open",
        priority: "medium",
        category: "technical",
        messages: [
          {
            sender: demoUser._id,
            message: "This is a demo support message for testing.",
          },
        ],
        lastActivityAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(`Ticket ready: ${ticket.subject}`);

    console.log("\nSeed completed successfully!");
    console.log("--------------------------------");
    console.log("Demo username: demo_user");
    console.log("Demo password: Demo@12345");
    console.log("--------------------------------");
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedDatabase();
