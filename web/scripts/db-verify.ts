/**
 * Quick Neon connectivity check (same driver as the app).
 * Run from repo root: cd web && pnpm db:verify
 */
import { config as loadEnv } from "dotenv";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { resolve } from "node:path";
import ws from "ws";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.local"), override: true });

neonConfig.webSocketConstructor = ws;

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set. Add it to web/.env.local.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
try {
  const { rows } = await pool.query<{ ok: number }>("SELECT 1 AS ok");
  console.log("Neon connection OK:", rows[0]?.ok === 1 ? "SELECT 1 succeeded" : rows);
} finally {
  await pool.end();
}
