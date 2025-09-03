require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cron = require("node-cron");
const axios = require("axios");

// Import routes
const authRoutes = require("./routes/authRoutes");

// Initialize app
const app = express();

app.use(express.json());
// Middleware
app.use(cors());


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


app.get("/api/analytics/live", async (req, res) => {
  const accessToken = req.query.accessToken;
  if (!accessToken) {
    return res.status(400).json({ error: "Facebook access token required" });
  }

  try {
    // 1. Get user pages
    const pagesRes = await axios.get(
      "https://graph.facebook.com/v18.0/me/accounts",
      { params: { access_token: accessToken } }
    );

    if (!pagesRes.data?.data || pagesRes.data.data.length === 0) {
      return res.json({ message: "No pages found for this user" });
    }

    const insightsData = [];

    // 2. Loop through pages
    for (const page of pagesRes.data.data) {
      const pageId = page.id;
      const pageName = page.name;
      const pageToken = page.access_token;

      // 3. Fetch some example metrics
      const metrics = [
        "page_impressions",
        "page_engaged_users",
        "page_fans"
      ];

      const insightsRes = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}/insights`,
        {
          params: {
            access_token: pageToken,
            metric: metrics.join(",")
          }
        }
      );

      insightsData.push({
        pageId,
        pageName,
        insights: insightsRes.data.data || []
      });
    }

    res.json(insightsData);
  } catch (err) {
    console.error("Error fetching live analytics:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});


// Start server using Render's PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
