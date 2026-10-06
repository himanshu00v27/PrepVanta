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

// --------------------------------------------------
// Topic definitions
// --------------------------------------------------

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

// --------------------------------------------------
// Demo questions
//
// These questions are intentionally small and simple.
// Their purpose is to ensure every topic has working,
// topic-specific practice content.
// --------------------------------------------------

const questionBank = {
  // ---------------- Aptitude ----------------

  Percentages: {
    title: "What is 25% of 200?",
    description: "Calculate 25 percent of 200.",
    options: ["25", "50", "75", "100"],
    answer: "50",
    explanation: "25% of 200 is 50.",
    solution: "(25 / 100) × 200 = 50.",
  },

  "Number Systems": {
    title: "Which of the following is a prime number?",
    description: "Choose the number that has exactly two factors.",
    options: ["9", "15", "17", "21"],
    answer: "17",
    explanation: "17 has only two factors: 1 and 17.",
    solution: "Check the factors of each option. Only 17 is prime.",
  },

  "Ratio and Proportion": {
    title: "Simplify the ratio 10:20.",
    description: "Reduce the given ratio to its simplest form.",
    options: ["1:2", "2:1", "5:20", "10:10"],
    answer: "1:2",
    explanation: "Both terms can be divided by 10.",
    solution: "10:20 = 1:2.",
  },

  Averages: {
    title: "What is the average of 10, 20 and 30?",
    description: "Find the arithmetic mean of the three numbers.",
    options: ["15", "20", "25", "30"],
    answer: "20",
    explanation: "The sum is 60 and there are three values.",
    solution: "(10 + 20 + 30) / 3 = 20.",
  },

  Mensuration: {
    title: "What is the area of a rectangle of length 5 and width 4?",
    description: "Calculate the area of the rectangle.",
    options: ["9", "18", "20", "25"],
    answer: "20",
    explanation: "Area of a rectangle is length multiplied by width.",
    solution: "5 × 4 = 20.",
  },

  "Profit and Loss": {
    title: "An item costs 100 and is sold for 120. What is the profit?",
    description: "Find the difference between selling price and cost price.",
    options: ["10", "20", "30", "40"],
    answer: "20",
    explanation: "Profit equals selling price minus cost price.",
    solution: "120 - 100 = 20.",
  },

  "Simple Interest": {
    title: "Find the simple interest on 1000 at 10% per year for 1 year.",
    description: "Use the simple interest formula.",
    options: ["50", "100", "150", "200"],
    answer: "100",
    explanation: "Simple interest is P × R × T / 100.",
    solution: "(1000 × 10 × 1) / 100 = 100.",
  },

  "Compound Interest": {
    title: "What is the amount on 1000 at 10% annually after 1 year?",
    description: "Calculate the amount after one year of compound interest.",
    options: ["1000", "1050", "1100", "1200"],
    answer: "1100",
    explanation: "After one year, 10% interest is added to the principal.",
    solution: "1000 + 10% of 1000 = 1100.",
  },

  "Time and Work": {
    title:
      "If a person completes a job in 10 days, what part is done in 1 day?",
    description: "Find the person's one-day work.",
    options: ["1/5", "1/10", "1/15", "1/20"],
    answer: "1/10",
    explanation: "One-day work is the reciprocal of total days.",
    solution: "1 / 10 of the work is completed each day.",
  },

  "Time, Speed and Distance": {
    title: "A car travels at 60 km/h for 2 hours. What distance does it cover?",
    description: "Use distance = speed × time.",
    options: ["60 km", "100 km", "120 km", "180 km"],
    answer: "120 km",
    explanation: "Distance is speed multiplied by time.",
    solution: "60 × 2 = 120 km.",
  },

  "Permutation and Combination": {
    title: "How many ways can 3 distinct objects be arranged?",
    description: "Find the number of permutations of three distinct objects.",
    options: ["3", "6", "9", "12"],
    answer: "6",
    explanation: "The number of arrangements is 3 factorial.",
    solution: "3! = 3 × 2 × 1 = 6.",
  },

  Probability: {
    title: "What is the probability of getting heads on a fair coin toss?",
    description:
      "Choose the probability of one desired outcome from two equal outcomes.",
    options: ["0", "1/4", "1/2", "1"],
    answer: "1/2",
    explanation: "A fair coin has two equally likely outcomes.",
    solution: "Probability = 1 desired outcome / 2 total outcomes = 1/2.",
  },

  // ---------------- Reasoning ----------------

  "Blood Relations": {
    title: "Your mother's brother is your?",
    description: "Identify the correct family relationship.",
    options: ["Cousin", "Uncle", "Brother", "Nephew"],
    answer: "Uncle",
    explanation: "Your mother's brother is your maternal uncle.",
    solution: "Mother's brother = uncle.",
  },

  Syllogisms: {
    title: "All cats are animals. Tom is a cat. What follows?",
    description: "Choose the logically valid conclusion.",
    options: [
      "Tom is an animal",
      "All animals are cats",
      "Tom is not an animal",
      "No conclusion",
    ],
    answer: "Tom is an animal",
    explanation:
      "If all cats are animals and Tom is a cat, Tom must be an animal.",
    solution: "Apply the universal statement to Tom.",
  },

  "Coding-Decoding": {
    title: "If CAT is coded as DBU, how is DOG coded using the same rule?",
    description: "Each letter is shifted forward by one alphabet position.",
    options: ["EPH", "CNE", "EOH", "DPG"],
    answer: "EPH",
    explanation: "D becomes E, O becomes P and G becomes H.",
    solution: "Shift each letter forward by one: DOG → EPH.",
  },

  Analogy: {
    title: "Bird is to Fly as Fish is to?",
    description: "Choose the word that completes the analogy.",
    options: ["Walk", "Swim", "Run", "Climb"],
    answer: "Swim",
    explanation:
      "Flying is a typical movement of a bird; swimming is typical for a fish.",
    solution: "Bird : Fly :: Fish : Swim.",
  },

  "Statement and Assumption": {
    title: "Statement: Carry an umbrella because it may rain. What is assumed?",
    description: "Identify the assumption behind the statement.",
    options: [
      "Rain is possible",
      "It will never rain",
      "Umbrellas cause rain",
      "The weather is always sunny",
    ],
    answer: "Rain is possible",
    explanation: "The advice only makes sense if rain is considered possible.",
    solution: "The underlying assumption is that rain may occur.",
  },

  "Number Series": {
    title: "Find the next number: 2, 4, 6, 8, ?",
    description: "Identify the pattern in the sequence.",
    options: ["9", "10", "11", "12"],
    answer: "10",
    explanation: "Each number increases by 2.",
    solution: "8 + 2 = 10.",
  },

  "Letter Series": {
    title: "Find the next letter: A, C, E, G, ?",
    description: "Identify the alphabetical pattern.",
    options: ["H", "I", "J", "K"],
    answer: "I",
    explanation: "The sequence skips one letter each time.",
    solution: "A, C, E, G, I.",
  },

  "Distance and Directions": {
    title: "If you face North and turn right, which direction do you face?",
    description: "Determine the direction after a right turn.",
    options: ["West", "East", "South", "North"],
    answer: "East",
    explanation: "A right turn from North points East.",
    solution: "North → right turn → East.",
  },

  "Seating Arrangement": {
    title: "A sits immediately left of B. Who is immediately right of A?",
    description: "Use the given seating relationship.",
    options: ["A", "B", "Cannot say", "Nobody"],
    answer: "B",
    explanation: "If A is immediately left of B, B is immediately right of A.",
    solution: "The relationship directly places B to A's right.",
  },

  "Height and Distance": {
    title:
      "Which instrument is commonly used to measure an angle of elevation?",
    description: "Choose the appropriate measuring instrument.",
    options: ["Thermometer", "Protractor", "Stopwatch", "Balance"],
    answer: "Protractor",
    explanation: "A protractor measures angles.",
    solution: "Angles of elevation are angular measurements.",
  },

  "HCF and LCM": {
    title: "What is the HCF of 8 and 12?",
    description: "Find the greatest common factor.",
    options: ["2", "4", "6", "8"],
    answer: "4",
    explanation: "4 is the greatest number that divides both 8 and 12.",
    solution: "Factors of 8: 1,2,4,8. Factors of 12: 1,2,3,4,6,12.",
  },

  "Clock and Calendar": {
    title: "How many hours are there in one day?",
    description: "Choose the standard number of hours in a day.",
    options: ["12", "18", "24", "48"],
    answer: "24",
    explanation: "A standard day contains 24 hours.",
    solution: "1 day = 24 hours.",
  },

  // ---------------- Technical ----------------

  Arrays: {
    title: "Which data structure stores elements using indexed positions?",
    description: "Choose the most appropriate data structure.",
    options: ["Array", "Stack", "Graph", "Tree"],
    answer: "Array",
    explanation: "Arrays store elements in indexed positions.",
    solution: "Array elements are accessed using an index.",
  },

  "Linked List": {
    title: "What connects nodes in a linked list?",
    description: "Choose the structure used to link one node to another.",
    options: ["Pointers or references", "SQL queries", "CSS rules", "Threads"],
    answer: "Pointers or references",
    explanation:
      "Linked-list nodes store references or pointers to other nodes.",
    solution: "Each node links to another node using a pointer or reference.",
  },

  Stacks: {
    title: "Which principle does a stack follow?",
    description: "Choose the standard stack access order.",
    options: ["FIFO", "LIFO", "Random", "Sorted"],
    answer: "LIFO",
    explanation: "Stacks use Last In, First Out.",
    solution: "The most recently inserted item is removed first.",
  },

  Queues: {
    title: "Which principle does a basic queue follow?",
    description: "Choose the standard queue access order.",
    options: ["FIFO", "LIFO", "Random", "Recursive"],
    answer: "FIFO",
    explanation: "Queues use First In, First Out.",
    solution: "The earliest inserted item is removed first.",
  },

  "Trees and Graphs": {
    title: "Which structure commonly represents hierarchical data?",
    description:
      "Choose the structure best suited to parent-child relationships.",
    options: ["Tree", "Queue", "Array only", "Hash value"],
    answer: "Tree",
    explanation:
      "Trees naturally represent hierarchical parent-child relationships.",
    solution: "A tree consists of nodes connected hierarchically.",
  },

  "Sorting and Searching": {
    title: "Which search algorithm requires sorted data?",
    description:
      "Choose the search algorithm that repeatedly halves the search range.",
    options: ["Binary Search", "Linear Search", "DFS", "BFS"],
    answer: "Binary Search",
    explanation: "Binary search relies on ordered data.",
    solution:
      "Binary search compares against the middle element of a sorted collection.",
  },

  "Dynamic Programming": {
    title: "What does dynamic programming commonly store?",
    description: "Choose what is reused to avoid repeated computation.",
    options: [
      "Previous subproblem results",
      "Only user passwords",
      "CSS selectors",
      "HTTP headers only",
    ],
    answer: "Previous subproblem results",
    explanation:
      "Dynamic programming stores results of overlapping subproblems.",
    solution:
      "Memoization or tabulation prevents recalculating the same subproblems.",
  },

  "Recursion and Backtracking": {
    title: "What is recursion?",
    description: "Choose the correct description.",
    options: [
      "A function calling itself",
      "A database transaction",
      "A CSS layout",
      "A network protocol",
    ],
    answer: "A function calling itself",
    explanation:
      "Recursive functions invoke themselves with smaller or changed inputs.",
    solution:
      "Recursion solves a problem by reducing it to similar subproblems.",
  },

  Hashing: {
    title: "What does a hash function produce from a key?",
    description: "Choose the value commonly used to locate stored data.",
    options: ["Hash value", "HTML page", "Thread", "SQL table"],
    answer: "Hash value",
    explanation: "A hash function maps a key to a hash value.",
    solution:
      "The hash value helps determine where data should be stored or found.",
  },

  "ER Models and Normalization": {
    title: "What does ER stand for in database design?",
    description: "Choose the correct expansion.",
    options: [
      "Entity Relationship",
      "External Request",
      "Execution Record",
      "Encoded Resource",
    ],
    answer: "Entity Relationship",
    explanation: "ER means Entity Relationship.",
    solution: "ER models describe entities and relationships between them.",
  },

  "SQL Queries": {
    title: "Which SQL command retrieves data?",
    description: "Choose the command used to read rows from a database.",
    options: ["SELECT", "DELETE", "DROP", "ALTER"],
    answer: "SELECT",
    explanation: "SELECT retrieves data from database tables.",
    solution: "Use SELECT with columns and a FROM clause to query data.",
  },

  "Transactions and Concurrency": {
    title: "Which property means a transaction is all-or-nothing?",
    description: "Choose the relevant ACID property.",
    options: ["Atomicity", "Consistency", "Isolation", "Durability"],
    answer: "Atomicity",
    explanation:
      "Atomicity ensures all operations succeed together or are rolled back.",
    solution: "A transaction behaves as one indivisible unit.",
  },

  "Indexing and Query Optimization": {
    title: "What is a common purpose of a database index?",
    description: "Choose the primary benefit of indexing.",
    options: [
      "Faster data lookup",
      "Increase monitor brightness",
      "Compile JavaScript",
      "Create CSS",
    ],
    answer: "Faster data lookup",
    explanation: "Indexes help databases locate records more efficiently.",
    solution: "An index provides an optimized lookup structure.",
  },

  "HTML and CSS": {
    title: "Which language is mainly used to style web pages?",
    description:
      "Choose the technology responsible for presentation and styling.",
    options: ["CSS", "HTML", "SQL", "C"],
    answer: "CSS",
    explanation: "CSS controls the presentation of HTML documents.",
    solution: "HTML structures content while CSS styles it.",
  },

  JavaScript: {
    title: "Which keyword declares a block-scoped variable in JavaScript?",
    description: "Choose a valid block-scoped declaration keyword.",
    options: ["let", "goto", "define", "include"],
    answer: "let",
    explanation: "let declares block-scoped variables.",
    solution:
      "JavaScript supports let and const for block-scoped declarations.",
  },

  React: {
    title: "What is commonly used to build reusable UI pieces in React?",
    description: "Choose the basic reusable building block.",
    options: ["Components", "SQL tables", "Processes", "Packets"],
    answer: "Components",
    explanation: "React applications are composed from reusable components.",
    solution: "Components encapsulate UI structure and behavior.",
  },

  "Node.js": {
    title: "Where does Node.js commonly execute JavaScript?",
    description: "Choose the environment associated with Node.js.",
    options: [
      "Server/runtime",
      "Only inside CSS",
      "Inside SQL only",
      "Printer",
    ],
    answer: "Server/runtime",
    explanation: "Node.js provides a JavaScript runtime outside the browser.",
    solution:
      "It is commonly used to execute JavaScript for backend applications.",
  },

  "REST APIs": {
    title: "Which HTTP method is commonly used to retrieve a resource?",
    description: "Choose the standard HTTP method for reading data.",
    options: ["GET", "POST", "DELETE", "PATCH"],
    answer: "GET",
    explanation: "GET requests retrieve resources.",
    solution: "REST APIs commonly use GET for read operations.",
  },

  "Process Management": {
    title: "What is a process in an operating system?",
    description: "Choose the most appropriate definition.",
    options: [
      "A program in execution",
      "A CSS selector",
      "A database column",
      "An HTML tag",
    ],
    answer: "A program in execution",
    explanation: "A process is an executing instance of a program.",
    solution: "The operating system manages executing programs as processes.",
  },

  "Memory Management": {
    title: "Which memory is generally volatile?",
    description:
      "Choose the memory whose contents are lost when power is removed.",
    options: ["RAM", "SSD", "Hard disk", "DVD"],
    answer: "RAM",
    explanation: "RAM is volatile main memory.",
    solution: "RAM requires power to retain its contents.",
  },

  Deadlocks: {
    title:
      "What can happen when processes wait indefinitely for each other's resources?",
    description: "Choose the operating-system condition described.",
    options: ["Deadlock", "Compilation", "Indexing", "Rendering"],
    answer: "Deadlock",
    explanation: "Circular resource waiting can result in deadlock.",
    solution:
      "Processes cannot continue because each is waiting for a resource held by another.",
  },

  "CPU Scheduling": {
    title: "Which scheduling algorithm processes jobs in arrival order?",
    description: "Choose the first-come scheduling algorithm.",
    options: ["FCFS", "Round Robin", "Priority", "SJF"],
    answer: "FCFS",
    explanation: "FCFS means First Come, First Served.",
    solution: "Jobs are handled in their arrival order.",
  },

  "File Systems": {
    title: "What does a file system primarily organize?",
    description: "Choose what a file system manages on storage devices.",
    options: [
      "Files and directories",
      "CSS animations",
      "CPU registers only",
      "Web APIs only",
    ],
    answer: "Files and directories",
    explanation: "File systems organize stored files and directories.",
    solution:
      "They provide structures for naming, storing and retrieving files.",
  },

  C: {
    title: "Which symbol terminates most statements in C?",
    description: "Choose the standard C statement terminator.",
    options: [";", ":", "#", "@"],
    answer: ";",
    explanation: "Most C statements end with a semicolon.",
    solution: "The semicolon marks the end of a statement.",
  },

  "C++": {
    title: "Which feature is strongly associated with C++?",
    description: "Choose a programming paradigm supported by C++.",
    options: [
      "Object-oriented programming",
      "Only database queries",
      "Only markup",
      "Only styling",
    ],
    answer: "Object-oriented programming",
    explanation: "C++ supports object-oriented programming.",
    solution: "C++ supports classes, objects, inheritance and polymorphism.",
  },

  Java: {
    title: "Which component executes Java bytecode?",
    description: "Choose the runtime responsible for executing Java bytecode.",
    options: ["JVM", "CSS", "SQL", "HTML"],
    answer: "JVM",
    explanation: "The Java Virtual Machine executes Java bytecode.",
    solution: "Java source is compiled to bytecode which runs on the JVM.",
  },

  Python: {
    title: "Which keyword defines a function in Python?",
    description: "Choose the Python function declaration keyword.",
    options: ["def", "function", "func", "define"],
    answer: "def",
    explanation: "Python uses def to define functions.",
    solution: "Example: def my_function():",
  },

  "SQL/MySQL": {
    title: "Which clause filters rows in an SQL query?",
    description: "Choose the clause used to specify row conditions.",
    options: ["WHERE", "ORDER", "GROUP", "FROM"],
    answer: "WHERE",
    explanation: "WHERE filters rows according to a condition.",
    solution: "Example: SELECT * FROM users WHERE active = 1.",
  },

  "OOP Concepts": {
    title: "Which OOP concept hides internal implementation details?",
    description:
      "Choose the concept associated with bundling and controlled access.",
    options: ["Encapsulation", "Iteration", "Compilation", "Indexing"],
    answer: "Encapsulation",
    explanation:
      "Encapsulation hides internal state behind controlled interfaces.",
    solution:
      "Data and related behavior are bundled inside an object or class.",
  },

  "Cybersecurity Basics": {
    title: "Which practice improves account security?",
    description: "Choose the safest general security practice.",
    options: [
      "Use strong unique passwords",
      "Share passwords publicly",
      "Disable all updates",
      "Open unknown attachments",
    ],
    answer: "Use strong unique passwords",
    explanation: "Strong unique passwords reduce account compromise risk.",
    solution: "Avoid password reuse and use strong credentials.",
  },

  "Computer Networks": {
    title: "Which protocol is commonly used to load web pages securely?",
    description: "Choose the secure web protocol.",
    options: ["HTTPS", "FTP", "SMTP", "ARP"],
    answer: "HTTPS",
    explanation: "HTTPS is HTTP protected using TLS.",
    solution: "Browsers commonly use HTTPS for secure web communication.",
  },

  "Data Science Basics": {
    title: "What is a dataset?",
    description: "Choose the most appropriate definition.",
    options: [
      "A collection of data",
      "A CSS property",
      "A CPU instruction only",
      "A network cable",
    ],
    answer: "A collection of data",
    explanation: "A dataset is an organized collection of data.",
    solution: "Datasets provide observations or records for analysis.",
  },

  "System Design": {
    title: "What does scalability describe in a software system?",
    description: "Choose the best description.",
    options: [
      "Ability to handle increasing load",
      "Ability to change text color",
      "Ability to rename a variable",
      "Ability to delete source code",
    ],
    answer: "Ability to handle increasing load",
    explanation:
      "Scalability is the ability of a system to cope with growth in demand.",
    solution: "A scalable design can support more users, traffic or data.",
  },
};

// --------------------------------------------------
// Seed
// --------------------------------------------------

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

    // --------------------------------------------------
    // Create/update all topics
    // --------------------------------------------------

    for (const [group, names] of Object.entries(topicGroups)) {
      const category = categoryNames[group];

      for (const name of names) {
        const topic = await Topic.findOneAndUpdate(
          {
            name,
            category,
          },
          {
            $set: {
              name,
              category,
              status: "published",
              createdBy: demoUser._id,
            },
          },
          {
            upsert: true,
            returnDocument: "after",
            setDefaultsOnInsert: true,
          },
        );

        createdTopics.set(`${group}:${name}`, topic);

        console.log(`Topic ready: ${category} -> ${name}`);
      }
    }

    console.log(`Topics ready: ${createdTopics.size}`);

    // --------------------------------------------------
    // Migrate old demo Percentages data if it exists
    // --------------------------------------------------

    const percentagesTopic = createdTopics.get("aptitude:Percentages");

    if (!percentagesTopic) {
      throw new Error("Percentages topic was not created.");
    }

    await Question.updateMany(
      {
        title: "What is 25% of 200?",
      },
      {
        $set: {
          category: "Aptitude",
          topic: percentagesTopic._id,
          status: "published",
        },
      },
    );

    await PracticeSet.updateMany(
      {
        title: "Demo Aptitude Practice",
      },
      {
        $set: {
          title: "Percentages Practice",
          topic: percentagesTopic._id,
          status: "published",
        },
      },
    );

    // --------------------------------------------------
    // Create/update one question for every topic
    // --------------------------------------------------

    let questionsReady = 0;
    let practiceSetsReady = 0;

    for (const [group, names] of Object.entries(topicGroups)) {
      const category = categoryNames[group];

      for (const name of names) {
        const topic = createdTopics.get(`${group}:${name}`);
        const data = questionBank[name];

        if (!topic) {
          throw new Error(`Topic missing during seed: ${name}`);
        }

        if (!data) {
          throw new Error(`Question data missing for topic: ${name}`);
        }

        const options = data.options.map((option) => ({
          text: option,
          isCorrect: option === data.answer,
        }));

        let question = await Question.findOne({
          topic: topic._id,
          title: data.title,
        });

        if (question) {
          question.description = data.description;
          question.type = "objective";
          question.category = category;
          question.topic = topic._id;
          question.difficulty = "easy";
          question.options = options;
          question.answer = data.answer;
          question.explanation = data.explanation;
          question.solution = data.solution;
          question.status = "published";
          question.createdBy = demoUser._id;

          await question.save();
        } else {
          question = await Question.create({
            title: data.title,
            description: data.description,
            type: "objective",
            category,
            topic: topic._id,
            difficulty: "easy",
            options,
            answer: data.answer,
            explanation: data.explanation,
            solution: data.solution,
            status: "published",
            createdBy: demoUser._id,
          });
        }

        questionsReady += 1;

        // --------------------------------------------------
        // Create/update the practice set for this topic
        // --------------------------------------------------

        let practiceSet = await PracticeSet.findOne({
          topic: topic._id,
        });

        if (!practiceSet) {
          practiceSet = await PracticeSet.findOne({
            title: `${name} Practice`,
          });
        }

        if (practiceSet) {
          practiceSet.title = `${name} Practice`;
          practiceSet.description = `Practice questions for ${name}.`;
          practiceSet.topic = topic._id;
          practiceSet.duration = 15;
          practiceSet.status = "published";
          practiceSet.createdBy = demoUser._id;

          const questionIds = practiceSet.questions.map((id) => String(id));

          if (!questionIds.includes(String(question._id))) {
            practiceSet.questions.push(question._id);
          }

          await practiceSet.save();
        } else {
          practiceSet = await PracticeSet.create({
            title: `${name} Practice`,
            description: `Practice questions for ${name}.`,
            topic: topic._id,
            questions: [question._id],
            duration: 15,
            status: "published",
            createdBy: demoUser._id,
          });
        }

        practiceSetsReady += 1;

        console.log(`Practice ready: ${category} -> ${name}`);
      }
    }

    // --------------------------------------------------
    // Final verification
    // --------------------------------------------------

    const publishedTopicCount = await Topic.countDocuments({
      status: "published",
    });

    const publishedQuestionCount = await Question.countDocuments({
      status: "published",
    });

    const publishedPracticeSetCount = await PracticeSet.countDocuments({
      status: "published",
    });

    console.log("----------------------------------------");
    console.log("Group 2 seed completed successfully");
    console.log(`Topics processed: ${createdTopics.size}`);
    console.log(`Questions ready: ${questionsReady}`);
    console.log(`Practice sets ready: ${practiceSetsReady}`);
    console.log(`Published topics in DB: ${publishedTopicCount}`);
    console.log(`Published questions in DB: ${publishedQuestionCount}`);
    console.log(`Published practice sets in DB: ${publishedPracticeSetCount}`);
    console.log("----------------------------------------");
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
