import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { businessCycles } from "@/lib/db/schema";
import { scoreNiches } from "@/lib/agent/decide";
import { runBuildPhase } from "@/lib/agent/build";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
// Allow up to 60s — build phase calls Exa + Claude
export const maxDuration = 60;

const StartSchema = z.object({
  category: z.string().min(1).max(200),
  depositAmountUsdc: z.string().default("20.00"),
});

/**
 * POST /api/agent/start
 *
 * Kicks off the full DECIDE + BUILD pipeline:
 * 1. Create a business cycle row
 * 2. Score niches via Claude (DECIDE phase)
 * 3. Run content pipeline and publish product (BUILD phase)
 *
 * Returns the created productId and productUrl.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = StartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { category, depositAmountUsdc } = parsed.data;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Create business cycle
  const [cycle] = await db
    .insert(businessCycles)
    .values({
      ownerInput: category,
      depositAmountUsdc,
    })
    .returning({ id: businessCycles.id });

  const cycleId = cycle.id;
  logger.info("agent.start", { cycleId, category, depositAmountUsdc });

  try {
    // DECIDE phase
    const decision = await scoreNiches(category, cycleId);

    // BUILD phase
    const build = await runBuildPhase(decision, cycleId, appUrl);

    return NextResponse.json({
      success: true,
      cycleId,
      productId: build.productId,
      productUrl: build.productUrl,
      selectedNiche: decision.selectedNiche,
      reason: decision.reason,
      candidates: decision.candidates,
      totalCostUsdc: build.totalCostUsdc,
    });
  } catch (err) {
    logger.error("agent.start.failed", { cycleId, error: String(err) });
    return NextResponse.json(
      {
        error: "Agent pipeline failed",
        cycleId,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
