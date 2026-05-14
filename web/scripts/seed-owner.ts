/**
 * Seed the owner row and default newsletterSettings.
 * Run: npx tsx scripts/seed-owner.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { owner, newsletterSettings } from "../lib/db/schema";

const root = process.cwd();
loadEnv({ path: resolve(root, ".env") });
loadEnv({ path: resolve(root, ".env.local"), override: true });

const email = process.env.OWNER_EMAIL ?? "owner@overnightco.ai";
const password = process.env.OWNER_PASSWORD ?? "changeme123";
const name = process.env.OWNER_NAME ?? "Owner";

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  // Upsert owner row
  await db
    .insert(owner)
    .values({ email: email.toLowerCase(), passwordHash, name })
    .onConflictDoUpdate({
      target: owner.email,
      set: { passwordHash, name },
    });

  // Upsert default settings
  const existing = await db.select({ id: newsletterSettings.id }).from(newsletterSettings).limit(1);
  if (existing.length === 0) {
    await db.insert(newsletterSettings).values({
      defaultCategory: "AI & crypto market intelligence",
      humanPriceUsdc: process.env.HUMAN_PRICE_USDC ?? "2.00",
      agentPriceUsdc: process.env.AGENT_PRICE_USDC ?? "0.50",
      payoutWalletAddress: process.env.DEFAULT_PAYOUT_WALLET ?? null,
      isPayoutEnabled: false,
    });
    console.log("Created default newsletter settings");
  }

  console.log(`Owner seeded: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
