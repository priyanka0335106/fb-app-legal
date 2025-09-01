import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function Dashboard() {
  const [analytics, setAnalytics] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);

  const fbUserId = localStorage.getItem("fbUserId");

  useEffect(() => {
    if (!fbUserId) return;
    axios
      .get(`http://localhost:5000/api/analytics/${fbUserId}`, { withCredentials: true })
      .then((res) => setAnalytics(res.data))
      .catch(() => toast.error("Failed to fetch analytics"));
  }, [fbUserId]);

  const fetchPosts = (pageId) => {
    setSelectedPage(pageId);
    axios
      .get(`http://localhost:5000/api/posts/${pageId}`)
      .then((res) => setPosts(res.data))
      .catch(() => toast.error("Failed to fetch posts"));
  };

  if (!fbUserId) return <p>Please login to view analytics.</p>;

  return (
    <div>
      <h2>Your Facebook Analytics</h2>
      {analytics.length === 0 ? (
        <p>No analytics found.</p>
      ) : (
        analytics.map((page) => (
          <div key={page.page_name}>
            <h3 onClick={() => fetchPosts(page.page_id)} style={{cursor:"pointer"}}>
              {page.page_name}
            </h3>
            {page.metrics.map((metric) => (
              <p key={metric.metric_name}>
                {metric.metric_name}: {metric.metric_value}
              </p>
            ))}
          </div>
        ))
      )}

      {selectedPage && (
        <div>
          <h3>Posts for Page {selectedPage}</h3>
          {posts.length === 0 ? (
            <p>No posts found.</p>
          ) : (
            posts.map((post) => (
              <div key={post.post_id} style={{ border: "1px solid #ccc", margin: "10px", padding: "10px" }}>
                <p><b>{post.message}</b></p>
                <p>Created: {new Date(post.created_time).toLocaleString()}</p>
                {post.metrics.map((m) => (
                  <p key={m.metric_name}>
                    {m.metric_name}: {m.metric_value}
                  </p>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
