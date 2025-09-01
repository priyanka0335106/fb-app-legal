require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true
};
app.use(cors(corsOptions));

const FB_APP_ID = process.env.FB_APP_ID 
const FB_APP_SECRET = process.env.FB_APP_SECRET 

const BASE_URL = 'http://localhost:3000';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'analytics_db'
});

// Step 1: Redirect to FB login
app.get('/auth/facebook', (req, res) => {
  const fbLoginUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${BASE_URL}/auth/facebook/callback&scope=pages_show_list,instagram_basic,read_insights`;
  res.redirect(fbLoginUrl);
});

// Step 2: FB callback
app.get('/auth/facebook/callback', async (req, res) => {
  const code = req.query.code;
  try {
    // Short-lived user token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        redirect_uri: `${BASE_URL}/auth/facebook/callback`,
        code
      }
    });
    const shortUserToken = tokenRes.data.access_token;

    // Long-lived user token
    const longUserRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FB_APP_ID,
        client_secret: FB_APP_SECRET,
        fb_exchange_token: shortUserToken
      }
    });
    const longUserToken = longUserRes.data.access_token;

    // Get user info
    const userRes = await axios.get('https://graph.facebook.com/me', {
      params: { access_token: longUserToken, fields: 'id,name' }
    });
    const fbUserId = userRes.data.id;
    const fbUserName = userRes.data.name;

    await db.query(
      "INSERT INTO users (fb_user_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=?",
      [fbUserId, fbUserName, fbUserName]
    );

    // Get pages
    const pagesRes = await axios.get('https://graph.facebook.com/me/accounts', {
      params: { access_token: longUserToken }
    });

    for (const page of pagesRes.data.data) {
      // Long-lived page token
      const pageRes = await axios.get(`https://graph.facebook.com/${page.id}`, {
        params: { fields: 'access_token,name', access_token: longUserToken }
      });
      const longPageToken = pageRes.data.access_token;

      await db.query(
        "INSERT INTO facebook_pages (fb_user_id, page_id, page_name, long_lived_token) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE long_lived_token=?",
        [fbUserId, page.id, page.name, longPageToken, longPageToken]
      );

      // Fetch analytics safely
      try {
        const analyticsRes = await axios.get(`https://graph.facebook.com/${page.id}/insights`, {
          params: { metric: "page_impressions,page_engaged_users", access_token: longPageToken }
        });

        for (const metric of analyticsRes.data.data) {
          if (metric.values.length > 0) {
            await db.query(
              "INSERT INTO facebook_analytics (page_id, metric_name, metric_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE metric_value=?",
              [page.id, metric.name, metric.values[0].value, metric.values[0].value]
            );
          }
        }
      } catch (insightsErr) {
        console.warn(`Could not fetch insights for page ${page.name}:`, insightsErr.response?.data || insightsErr.message);
      }
    }

   res.json({
  fbUserId,
  fbUserName,
  message: `Welcome ${fbUserName}, your pages & analytics have been fetched!`
});

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Failed to fetch analytics");
  }


  const postsRes = await axios.get(`https://graph.facebook.com/${page.id}/posts`, {
  params: {
    access_token: longPageToken,
    fields: "id,message,created_time"
  }
});

for (const post of postsRes.data.data) {
  // Save post metadata
  await db.query(
    `INSERT INTO facebook_posts (page_id, post_id, message, created_time)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE message=?, created_time=?`,
    [page.id, post.id, post.message || '', post.created_time, post.message || '', post.created_time]
  );

  // Fetch insights for each post
  try {
    const insightsRes = await axios.get(`https://graph.facebook.com/${post.id}/insights`, {
      params: {
        metric: "post_impressions,post_engaged_users",
        access_token: longPageToken
      }
    });

    for (const metric of insightsRes.data.data) {
      await db.query(
        `INSERT INTO facebook_post_analytics (post_id, metric_name, metric_value)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE metric_value=?`,
        [post.id, metric.name, metric.values[0].value, metric.values[0].value]
      );
    }
  } catch (err) {
    console.warn(`Could not fetch insights for post ${post.id}:`, err.response?.data || err.message);
  }
}
});

// API route for frontend
app.get('/api/analytics/:fbUserId', async (req, res) => {
  const { fbUserId } = req.params;
  try {
    const [pages] = await db.query(
      "SELECT page_id, page_name FROM facebook_pages WHERE fb_user_id=?",
      [fbUserId]
    );

    const analytics = [];
    for (const page of pages) {
      const [metrics] = await db.query(
        "SELECT metric_name, metric_value FROM facebook_analytics WHERE page_id=?",
        [page.page_id]
      );
      analytics.push({ page_name: page.page_name, metrics });
    }

    res.json(analytics);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to fetch analytics");
  }
});

app.listen(5000, () => console.log("Server running on 5000"));
