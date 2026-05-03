import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { desc } from "drizzle-orm";

import { db } from "@/lib/db";
import { businessCycles } from "@/lib/db/schema";
import { runReportPhase } from "@/lib/agent/report";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ReportSchema = z.object({
  cycleId: z.string().uuid().optional(),
});

/**
 * POST /api/internal/report
 *
 * Cron-triggered REPORT phase.
 * If cycleId not provided, uses the most recent cycle.
 * Protected by CRON_SECRET.
 */
export async function POST(req: Request) {
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

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  let cycleId = parsed.data.cycleId;

  // If no cycleId, use most recent cycle
  if (!cycleId) {
    const [latest] = await db
      .select({ id: businessCycles.id })
      .from(businessCycles)
      .orderBy(desc(businessCycles.createdAt))
      .limit(1);

    if (!latest) {
      return NextResponse.json(
        { error: "No business cycles found" },
        { status: 404 },
      );
    }
    cycleId = latest.id;
  }

  logger.info("cron.report.start", { cycleId });

  try {
    const result = await runReportPhase(cycleId);
    logger.info("cron.report.complete", { cycleId, decision: result.cycleDecision });
    return NextResponse.json({ success: true, cycleId, ...result });
  } catch (err) {
    logger.error("cron.report.failed", { cycleId, error: String(err) });
    return NextResponse.json(
      { error: "Report failed", cycleId, detail: String(err) },
      { status: 500 },
    );
  }
}
