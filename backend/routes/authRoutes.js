const express = require("express");
const router = express.Router();
const { facebookCallback } = require("../controllers/authController");

// /auth/facebook/callback
router.get("/facebook/callback", facebookCallback);

module.exports = router;
