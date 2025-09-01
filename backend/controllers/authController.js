const axios = require("axios");
const pool = require("../db");

exports.facebookCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Code not provided");

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

    const accessToken = tokenRes.data.access_token;

    // Save token for the logged-in user
    // Assume req.user.id is the logged-in user
    await pool.execute("UPDATE users SET fb_access_token=? WHERE id=?", [accessToken, req.user.id]);

    res.send("Facebook connected! Analytics will be fetched in background.");
       res.redirect(`https://priyanka0335106.github.io/?fb_connected=1`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to connect Facebook");
  }
};
