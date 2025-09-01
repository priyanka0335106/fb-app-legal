import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

export default function FacebookCallback() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const error = query.get("error");
    const errorDescription = query.get("error_description");
    const code = query.get("code");

    if (error) {
      toast.error(`Facebook login failed: ${errorDescription}`);
      navigate("/"); // back to login
      return;
    }

    if (code) {
      // Call backend to exchange code for user/page tokens
      axios
        .get(`http://localhost:5000/auth/facebook/callback?code=${code}`, {
          withCredentials: true, // important for cookies / sessions
        })
        .then((res) => {
          // Backend fetches analytics and returns fbUserId
          // For simplicity, store fbUserId in localStorage
          const fbUserId = res.data.fbUserId || "dummy"; // fallback if not returned
          localStorage.setItem("fbUserId", fbUserId);

          toast.success("Facebook login successful!");
          navigate("/dashboard");
        })
        .catch((err) => {
          toast.error("Failed to complete Facebook login.");
          console.error(err.response?.data || err.message);
          navigate("/");
        });
    }
  }, [location, navigate]);

  return <h2>Processing Facebook login...</h2>;
}
