const cron = require("node-cron");
const axios = require("axios");
const pool = require("../db");

// Run every hour
cron.schedule("0 * * * *", async () => {
  console.log("Fetching Facebook analytics in background...");

  try {
    const [users] = await pool.execute("SELECT id, fb_access_token FROM users WHERE fb_access_token IS NOT NULL");

    for (const user of users) {
      try {
        // Fetch pages
        const pagesRes = await axios.get("https://graph.facebook.com/v18.0/me/accounts", {
          params: { access_token: user.fb_access_token },
        });

        for (const page of pagesRes.data.data) {
          // Save page info
          await pool.execute(
            `INSERT INTO facebook_pages (user_id, page_id, page_name, access_token) 
             VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE page_name=?, access_token=?`,
            [user.id, page.id, page.name, page.access_token, page.name, page.access_token]
          );

          // Fetch page analytics
          const insightsRes = await axios.get(`https://graph.facebook.com/v18.0/${page.id}/insights`, {
            params: { access_token: page.access_token },
          });

          for (const insight of insightsRes.data.data) {
            await pool.execute(
              `INSERT INTO facebook_analytics (page_id, metric_name, metric_value) 
               VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE metric_value=?`,
              [page.id, insight.name, insight.values[0].value, insight.values[0].value]
            );
          }

          // Fetch page posts
          const postsRes = await axios.get(`https://graph.facebook.com/v18.0/${page.id}/posts`, {
            params: { access_token: page.access_token },
          });

          for (const post of postsRes.data.data) {
            await pool.execute(
              `INSERT INTO facebook_posts (page_id, post_id, message, created_time) 
               VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE message=?, created_time=?`,
              [page.id, post.id, post.message || "", post.created_time || null, post.message || "", post.created_time || null]
            );

            // Fetch post analytics
            const postInsightsRes = await axios.get(`https://graph.facebook.com/v18.0/${post.id}/insights`, {
              params: { access_token: page.access_token },
            });

            for (const metric of postInsightsRes.data.data) {
              await pool.execute(
                `INSERT INTO facebook_post_analytics (post_id, metric_name, metric_value) 
                 VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE metric_value=?`,
                [post.id, metric.name, metric.values[0].value, metric.values[0].value]
              );
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data for user", user.id, err.message);
      }
    }
    console.log("Facebook analytics fetch done!");
  } catch (err) {
    console.error("Cron job error:", err.message);
  }
});
