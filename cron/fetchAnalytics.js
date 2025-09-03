require("dotenv").config();
const cron = require("node-cron");
const axios = require("axios");
let pool = require("../db"); // import once, but allow reinit

// Helper: recreate DB pool if connection is lost
function resetPool() {
  console.log("♻️ Reconnecting MySQL pool...");
  delete require.cache[require.resolve("../db")]; // clear old pool
  pool = require("../db"); // reload new pool
}

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Fetching Facebook analytics in background...");

  try {
    // Get all users who have a stored Facebook access token
    const [users] = await pool.execute(
      "SELECT id, fb_access_token FROM users WHERE fb_access_token IS NOT NULL"
    );

    for (const user of users) {
      try {
        // Fetch pages for user
        const pagesRes = await axios.get(
          "https://graph.facebook.com/v18.0/me/accounts",
          { params: { access_token: user.fb_access_token } }
        );

        if (!pagesRes.data?.data) continue;

        for (const page of pagesRes.data.data) {
          const pageId = page.id;
          const pageName = page.name || "";
          const pageToken = page.access_token;

          // Save or update page info
          await pool.execute(
            `INSERT INTO facebook_pages (user_id, page_id, page_name, access_token) 
             VALUES (?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE page_name=?, access_token=?`,
            [user.id, pageId, pageName, pageToken, pageName, pageToken]
          );

          // Fetch page analytics (insights)
          const insightsRes = await axios.get(
            `https://graph.facebook.com/v18.0/${pageId}/insights`,
            { params: { access_token: pageToken } }
          );

          if (insightsRes.data?.data) {
            for (const insight of insightsRes.data.data) {
              const value =
                Array.isArray(insight.values) && insight.values[0]?.value
                  ? insight.values[0].value
                  : 0;

              await pool.execute(
                `INSERT INTO facebook_analytics (page_id, metric_name, metric_value) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE metric_value=?`,
                [pageId, insight.name, value, value]
              );
            }
          }

          // Fetch page posts
          const postsRes = await axios.get(
            `https://graph.facebook.com/v18.0/${pageId}/posts`,
            { params: { access_token: pageToken } }
          );

          if (!postsRes.data?.data) continue;

          for (const post of postsRes.data.data) {
            const postId = post.id;
            const message = post.message || "";
            const createdTime = post.created_time || null;

            // Save or update post
            await pool.execute(
              `INSERT INTO facebook_posts (page_id, post_id, message, created_time) 
               VALUES (?, ?, ?, ?) 
               ON DUPLICATE KEY UPDATE message=?, created_time=?`,
              [pageId, postId, message, createdTime, message, createdTime]
            );

            // Fetch post analytics
            const postInsightsRes = await axios.get(
              `https://graph.facebook.com/v18.0/${postId}/insights`,
              { params: { access_token: pageToken } }
            );

            if (postInsightsRes.data?.data) {
              for (const metric of postInsightsRes.data.data) {
                const value =
                  Array.isArray(metric.values) && metric.values[0]?.value
                    ? metric.values[0].value
                    : 0;

                await pool.execute(
                  `INSERT INTO facebook_post_analytics (post_id, metric_name, metric_value) 
                   VALUES (?, ?, ?) 
                   ON DUPLICATE KEY UPDATE metric_value=?`,
                  [postId, metric.name, value, value]
                );
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data for user", user.id, err.message);
      }
    }

    console.log("✅ Facebook analytics fetch done!");
  } catch (err) {
    console.error("Cron job error:", err.message, " Code:", err.code);

    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      resetPool(); // reconnect MySQL pool
    }
  }
});
