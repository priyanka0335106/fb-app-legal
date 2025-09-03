// controllers/authController.js
const axios = require("axios");

exports.facebookCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "Code not provided" });

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.get(
      "https://graph.facebook.com/v23.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FB_APP_ID,
          client_secret: process.env.FB_APP_SECRET,
          redirect_uri: process.env.FB_REDIRECT_URI,
          code,
        },
      }
    );

    const userAccessToken = tokenRes.data?.access_token;
    if (!userAccessToken) {
      return res
        .status(400)
        .json({ message: "Failed to get access token", data: tokenRes.data });
    }

    // 2. Get user info
    const userRes = await axios.get("https://graph.facebook.com/me", {
      params: {
        access_token: userAccessToken,
        fields: "id,name,email",
      },
    });
    const userData = userRes.data;

    // 3. Get pages managed by this user
    const pagesRes = await axios.get(
      "https://graph.facebook.com/me/accounts",
      {
        params: { access_token: userAccessToken },
      }
    );

    const pages = pagesRes.data?.data || [];
    if (pages.length === 0) {
      return res.json({
        message: "Login successful, but no pages found for this user.",
        user: userData,
        accessToken: userAccessToken,
        pages: [],
        insights: [],
      });
    }

    // 4. Pick first page
    const firstPage = pages[0];
    const pageId = firstPage.id;
    const pageAccessToken = firstPage.access_token;

    // 5. Get insights for first page
    const insightsRes = await axios.get(
      `https://graph.facebook.com/v19.0/${pageId}/insights`,
      {
        params: {
          metric: "page_impressions,page_engaged_users,page_fans",
          period: "day",
          access_token: pageAccessToken,
        },
      }
    );

    const insights = insightsRes.data?.data || [];

    // 6. Send everything back to frontend
    res.json({
      message: "Facebook login successful",
      user: userData,
      accessToken: userAccessToken, // store if you need later
      page: {
        id: pageId,
        name: firstPage.name,
        accessToken: pageAccessToken,
      },
      insights,
    });
  } catch (err) {
    console.error("Facebook OAuth error:", err.response?.data || err.message);
    res.status(400).json({
      message: "Facebook OAuth failed",
      error: err.response?.data || err.message,
    });
  }
};
