const axios = require("axios");
const pool = require("../db");

exports.facebookCallback = async (req, res) => {
  const { code, userId } = req.query; // get userId from frontend query
  if (!code) return res.status(400).send("Code not provided");
  if (!userId) return res.status(400).send("User ID not provided");

  try {
    // Exchange code for access token
    const tokenRes = await axios.get("https://graph.facebook.com/v23.0/oauth/access_token", {
      params: {
        client_id: process.env.FB_APP_ID,
        client_secret: process.env.FB_APP_SECRET,
        redirect_uri: process.env.FB_REDIRECT_URI,
        code,
      },
    });
    
        if (!tokenRes.data || !tokenRes.data.access_token) {
      console.error("No access token returned from Facebook:", tokenRes.data);
      return res.status(400).send("Failed to get access token from Facebook");
    }
    const accessToken = tokenRes.data.access_token;

    // Save token for the user
    await pool.execute("UPDATE users SET fb_access_token=? WHERE id=?", [accessToken, userId]);

    // Redirect to frontend with success query
    res.redirect(`https://priyanka0335106.github.io/?fb_connected=1`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to connect Facebook");
  }
};
