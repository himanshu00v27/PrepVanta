const dns = require("dns");

dns.setServers(["8.8.8.8"]);
const { generalLimiter } = require("./middleware/rateLimiters");
const maintenanceMiddleware = require("./middleware/maintenanceMiddleware");

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const testRoutes = require("./routes/testRoutes");
const adminRoutes = require("./routes/adminRoutes");
const companyRoutes = require("./routes/companyRoutes");
const supportRoutes = require("./routes/supportRoutes");
const userRoutes = require("./routes/userRoutes");
const compilerRoutes = require("./routes/compilerRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const questionsRoutes = require("./routes/questionsRoutes");
const practiceRoutes = require("./routes/practiceRoutes");
const attemptRoutes = require("./routes/attemptRoutes");
const progressRoutes = require("./routes/progressRoutes");
const topicRoutes = require("./routes/topicRoutes");
const Question = require("./models/Question");
const Topic = require("./models/Topic");
const app = express();

app.use(cors());
app.use(express.json());
app.use(generalLimiter);

/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {
  res.json({
    message: "PrepVanta backend is running",
  });
});

/* =========================
   MAINTENANCE MODE
========================= */

app.use(maintenanceMiddleware);

/* =========================
   AUTH ROUTES
========================= */

app.get("/api/stats/public", async (req, res) => {
  try {
    const [questionCount, topicCount] = await Promise.all([
      Question.countDocuments({ status: "published" }),
      Topic.countDocuments({ status: "published" }),
    ]);

    res.json({ questionCount, topicCount });
  } catch (error) {
    console.error("Public statistics error:", error.message);
    res.status(500).json({ message: "Unable to load statistics" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/compiler", compilerRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/topics", topicRoutes);
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, "127.0.0.1", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  });
