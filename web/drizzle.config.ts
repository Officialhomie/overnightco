import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Match Next.js: `.env` then `.env.local` (local overrides).
const configDir = fileURLToPath(new URL(".", import.meta.url));
loadEnv({ path: resolve(configDir, ".env") });
loadEnv({ path: resolve(configDir, ".env.local"), override: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing or empty. Paste your Neon connection string into web/.env.local, then run pnpm db:push again.",
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
