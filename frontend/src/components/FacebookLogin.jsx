import React from "react";

export default function FacebookLogin() {
  const handleFBLogin = () => {
    const fbAppId = process.env.REACT_APP_FB_APP_ID;
    const redirectUri = "http://localhost:5000/auth/facebook/callback";

    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${redirectUri}&scope=pages_show_list,instagram_basic,read_insights`;
  };

  return (
    <button onClick={handleFBLogin} style={{ padding: "10px 20px", backgroundColor: "#1877f2", color: "white", border: "none", borderRadius: "5px" }}>
      Login with Facebook
    </button>
  );
}
