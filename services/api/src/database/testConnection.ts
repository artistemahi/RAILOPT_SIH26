import { pool } from "../config/database.js";

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW() AS current_time;");
    console.log("✅ PostgreSQL connected!");
    console.log("Server time:", result.rows[0].current_time);
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:");
    console.error(error);
  } finally {
    await pool.end();
  }
}

testConnection();