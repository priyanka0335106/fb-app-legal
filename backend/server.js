require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");

// Initialize cron jobs
require("./cron/fetchAnalytics");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/auth", authRoutes);

// Dashboard analytics API
const pool = require("./db");
app.get("/api/analytics/:userId", async (req, res) => {
  const { userId } = req.params;
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

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
