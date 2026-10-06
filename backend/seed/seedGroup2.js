require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");

const User = require("../models/User");
const Topic = require("../models/Topic");
const Question = require("../models/Question");
const PracticeSet = require("../models/PracticeSet");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/prepvanta";

const topicGroups = {
  aptitude: [
    "Percentages",
    "Number Systems",
    "Ratio and Proportion",
    "Averages",
    "Mensuration",
    "Profit and Loss",
    "Simple Interest",
    "Compound Interest",
    "Time and Work",
    "Time, Speed and Distance",
    "Permutation and Combination",
    "Probability",
  ],

  reasoning: [
    "Blood Relations",
    "Syllogisms",
    "Coding-Decoding",
    "Analogy",
    "Statement and Assumption",
    "Number Series",
    "Letter Series",
    "Distance and Directions",
    "Seating Arrangement",
    "Height and Distance",
    "HCF and LCM",
    "Clock and Calendar",
  ],

  topics: [
    "Arrays",
    "Linked List",
    "Stacks",
    "Queues",
    "Trees and Graphs",
    "Sorting and Searching",
    "Dynamic Programming",
    "Recursion and Backtracking",
    "Hashing",
    "ER Models and Normalization",
    "SQL Queries",
    "Transactions and Concurrency",
    "Indexing and Query Optimization",
    "HTML and CSS",
    "JavaScript",
    "React",
    "Node.js",
    "REST APIs",
    "Process Management",
    "Memory Management",
    "Deadlocks",
    "CPU Scheduling",
    "File Systems",
    "C",
    "C++",
    "Java",
    "Python",
    "SQL/MySQL",
    "OOP Concepts",
    "Cybersecurity Basics",
    "Computer Networks",
    "Data Science Basics",
    "System Design",
  ],
};

const categoryNames = {
  aptitude: "Aptitude",
  reasoning: "Reasoning",
  topics: "Technical",
};

async function seedGroup2() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");

    const demoUser = await User.findOne({
      username: "demo_user",
    });

    if (!demoUser) {
      throw new Error("Demo user not found. Run the main seed script first.");
    }

    console.log(`Using seed owner: ${demoUser.username}`);

    const createdTopics = new Map();

    for (const [group, names] of Object.entries(topicGroups)) {
      const category = categoryNames[group];

      for (const name of names) {
        const topic = await Topic.findOneAndUpdate(
          { name, category },
          {
            name,
            category,
            status: "published",
            createdBy: demoUser._id,
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        );

        createdTopics.set(`${group}:${name}`, topic);

        console.log(`Topic ready: ${category} -> ${name}`);
      }
    }

    console.log(`Topics ready: ${createdTopics.size}`);
    // --------------------------------------------------
    // Migrate existing demo percentage question
    // --------------------------------------------------
    const percentagesTopic = createdTopics.get("aptitude:Percentages");

    if (!percentagesTopic) {
      throw new Error("Percentages topic was not created.");
    }

    const percentageQuestion = await Question.findOneAndUpdate(
      {
        title: "What is 25% of 200?",
      },
      {
        category: "Aptitude",
        topic: percentagesTopic._id,
        status: "published",
      },
      {
        new: true,
      },
    );

    if (percentageQuestion) {
      console.log(
        `Question migrated to Percentages: ${percentageQuestion.title}`,
      );
    } else {
      console.log(
        "Existing percentage demo question was not found; skipping migration.",
      );
    }

    // --------------------------------------------------
    // Migrate existing demo practice set
    // --------------------------------------------------
    const demoPracticeSet = await PracticeSet.findOneAndUpdate(
      {
        title: "Demo Aptitude Practice",
      },
      {
        title: "Percentages Practice",
        topic: percentagesTopic._id,
        status: "published",
      },
      {
        new: true,
      },
    );

    if (demoPracticeSet) {
      console.log(`Practice set migrated: ${demoPracticeSet.title}`);
    } else {
      console.log(
        "Existing demo practice set was not found; skipping migration.",
      );
    }
  } catch (error) {
    console.error("Group 2 seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

seedGroup2();
