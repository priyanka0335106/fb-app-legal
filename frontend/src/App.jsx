import React from "react";
import { Routes, Route } from "react-router-dom";
import LoginWithFacebook from "./LoginWithFacebook";
import FacebookCallback from "./FacebookCallback";
import Dashboard from "./Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginWithFacebook />} />
      <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}
