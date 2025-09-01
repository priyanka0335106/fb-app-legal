import React, { useEffect, useState } from "react";
import API from "../utils/api";

export default function Dashboard({ userId }) {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await API.get(`/analytics/${userId}`);
        setAnalytics(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [userId]);

  if (loading) return <p>Loading analytics...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Facebook Analytics Dashboard</h1>
      {analytics.length === 0 && <p>No analytics available yet.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
        {analytics.map((item) => (
          <div key={`${item.page_id}-${item.metric_name}`} style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "5px" }}>
            <h3>{item.page_name}</h3>
            <p><strong>{item.metric_name}:</strong> {item.metric_value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
