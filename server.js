require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

// Import routes
const authRoutes = require("./routes/authRoutes");

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/auth", authRoutes);

// Optional: Database connection
let pool;
try {
  pool = require("./db");
  console.log("Database connected successfully");
} catch (err) {
  console.error("Database connection failed:", err.message);
}

// Root route
app.get("/", (req, res) => res.send("Backend is live!"));

// Analytics API (only if DB is available)
if (pool) {
  app.get("/api/analytics/:userId", async (req, res) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).send("User ID is required");

    try {
      const [analytics] = await pool.execute(
        `SELECT fa.page_id, fa.metric_name, fa.metric_value, fp.page_name 
         FROM facebook_analytics fa 
         JOIN facebook_pages fp ON fa.page_id = fp.page_id 
         WHERE fp.user_id=?`,
        [userId]
      );
      res.json(analytics);
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to fetch analytics");
    }
  });

  // Initialize cron jobs safely
  try {
    require("./cron/fetchAnalytics");
    console.log("Cron jobs loaded successfully");
  } catch (err) {
    console.error("Cron job failed to load:", err.message);
  }
} else {
  console.warn("Analytics API and cron jobs disabled due to DB connection issue.");
}

// Start server using Render's PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
