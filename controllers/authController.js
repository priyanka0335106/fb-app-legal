// controllers/authController.js
const axios = require('axios');

exports.facebookCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Code not provided" });
  }

  try {
    // Exchange code for access token
    const tokenRes = await axios.get("https://graph.facebook.com/v23.0/oauth/access_token", {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri: process.env.FB_REDIRECT_URI, // must exactly match FB settings
        code
      }
    });

    const accessToken = tokenRes.data.access_token;

    // Optional: fetch user info
    const userRes = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: accessToken,
        fields: 'id,name,email'
      }
    });

    res.json({
      message: "Facebook login successful",
      user: userRes.data,
      accessToken
    });

  } catch (err) {
    // Log the exact response from Facebook
    console.error("Facebook OAuth error:", err.response?.data || err.message);

    // Return friendly error to frontend
    const fbError = err.response?.data?.error || {};
    res.status(400).json({
      message: "Facebook OAuth failed",
      error: fbError
    });
  }
};
