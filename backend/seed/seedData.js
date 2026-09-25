require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Company = require("../models/Company");
const Setting = require("../models/Setting");
const Ticket = require("../models/Ticket");

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
    // 3. Create platform setting
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
    // 4. Create demo help-desk ticket
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
