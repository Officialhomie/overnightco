import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

// WebSocket polyfill for local dev and scripts only.
// Vercel serverless has native WebSocket — setting ws there causes "b.mask is not a function".
if (!process.env.VERCEL) {
  neonConfig.webSocketConstructor = ws;
}

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// Lazy singleton — deferred until first use so build-time analysis doesn't throw
let _db: DrizzleDb | undefined;

export function getDb(): DrizzleDb {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _db = drizzle(new Pool({ connectionString: url }), { schema });
  }
  return _db;
}

// Proxy so callers can use `db.select()` etc. without calling getDb() each time
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop: string | symbol) {
    return getDb()[prop as keyof DrizzleDb];
  },
});
