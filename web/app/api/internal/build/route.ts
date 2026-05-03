import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { businessCycles, newsletterSettings } from "@/lib/db/schema";
import { scoreNiches } from "@/lib/agent/decide";
import { runBuildPhase } from "@/lib/agent/build";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BuildSchema = z.object({
  category: z.string().min(1).max(200).optional(),
  depositAmountUsdc: z.string().optional(),
});

/**
 * POST /api/internal/build
 *
 * Cron-triggered DECIDE + BUILD phase.
 * Protected by CRON_SECRET (set in Vercel project settings).
 *
 * Uses the default category from newsletterSettings if not provided.
 */
export async function POST(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine for cron
  }

  const parsed = BuildSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  // Get settings for default category
  const [settings] = await db.select().from(newsletterSettings).limit(1);
  const category =
    parsed.data.category ??
    settings?.defaultCategory ??
    "AI & crypto market intelligence";

  const depositAmountUsdc = parsed.data.depositAmountUsdc ?? "20.00";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  logger.info("cron.build.start", { category, depositAmountUsdc });

  // Create business cycle
  const [cycle] = await db
    .insert(businessCycles)
    .values({ ownerInput: category, depositAmountUsdc })
    .returning({ id: businessCycles.id });

  const cycleId = cycle.id;

  try {
    const decision = await scoreNiches(category, cycleId);
    const build = await runBuildPhase(decision, cycleId, appUrl);

    logger.info("cron.build.complete", {
      cycleId,
      productId: build.productId,
      title: build.title,
      totalCostUsdc: build.totalCostUsdc,
    });

    return NextResponse.json({
      success: true,
      cycleId,
      productId: build.productId,
      productUrl: build.productUrl,
      selectedNiche: decision.selectedNiche,
    });
  } catch (err) {
    logger.error("cron.build.failed", { cycleId, error: String(err) });
    return NextResponse.json(
      { error: "Build failed", cycleId, detail: String(err) },
      { status: 500 },
    );
  }
}
