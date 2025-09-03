// controllers/authController.js
const axios = require('axios');

exports.facebookCallback = async (req, res) => {
  const { code } = req.query;
 console.log("Token response raw:0");
  if (!code) {
    return res.status(400).json({ error: "Code not provided" });
  }

  try {
     console.log("Token response raw:");
    // Exchange code for access token
    const tokenRes = await axios.get("https://graph.facebook.com/v23.0/oauth/access_token", {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri: process.env.FB_REDIRECT_URI, // must exactly match FB settings
        code
      }
    });
     console.log("Token response raw:", tokenRes.data);
    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.status(400).json({ message: "Failed to get access token", data: tokenRes.data });
    }

    console.log("Token response:", tokenRes.data);

    // Fetch user info safely
    let userData = {};
    try {
      console.log("id issue")
      const userRes = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: accessToken,
          fields: 'id,name,email' // add email if needed
        }
      });
      userData = userRes.data || {};
    } catch (userErr) {
      console.error("Failed to fetch Facebook user info:", userErr.response?.data || userErr.message);
      // continue without crashing
    }

    res.json({
      message: "Facebook login successful",
      user: userData, // safe fallback
      accessToken
    });

  } catch (err) {
    // Log exact response from Facebook
    const fbError = err.response?.data?.error || {};
    console.error("Facebook OAuth error:", fbError);

    // Handle expired/used code
    if (fbError.code === 100 || fbError.message?.includes("expired") || fbError.message?.includes("used")) {
      return res.status(400).json({
        message: "Facebook login code expired or already used. Please try logging in again.",
        error: fbError
      });
    }

    res.status(400).json({
      message: "Facebook OAuth failed",
      error: fbError
    });
  }
};
