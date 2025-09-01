import React from "react";

export default function LoginWithFacebook() {
  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/facebook";
  };

  return (
    <div>
      <h2>Login to access your Facebook Analytics</h2>
      <button onClick={handleLogin}>Login with Facebook</button>
    </div>
  );
}
