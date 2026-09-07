import pg from "pg";
import { config } from "./env.js";

console.log("DATABASE_URL:", config.databaseUrl ? "<configured>" : "<missing>");
const { Pool } = pg;
export const pool = new Pool({
  connectionString: config.databaseUrl,
});