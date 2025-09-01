import React, { useState } from "react";
import FacebookLogin from "../components/FacebookLogin";
import Dashboard from "../components/Dashboard";

export default function Home() {
  const [userId, setUserId] = useState(null);

  // Replace this with actual logged-in user ID
  const handleLoginSuccess = (id) => {
    setUserId(id);
  };

  return (
    <div>
      {!userId ? (
        <div style={{ marginTop: "50px", textAlign: "center" }}>
          <h2>Login with Facebook to see your page analytics</h2>
          <FacebookLogin />
        </div>
      ) : (
        <Dashboard userId={userId} />
      )}
    </div>
  );
}
