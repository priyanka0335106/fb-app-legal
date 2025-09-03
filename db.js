// db.js
const mysql = require("mysql2/promise");

let pool;

function createPool() {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  pool.on("error", (err) => {
    console.error("MySQL pool error:", err.code);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("Recreating MySQL pool...");
      createPool(); // reconnect
    }
  });
}

createPool();

module.exports = pool;
