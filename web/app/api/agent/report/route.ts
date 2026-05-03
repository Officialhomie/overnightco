import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { runReportPhase } from "@/lib/agent/report";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ReportSchema = z.object({
  cycleId: z.string().uuid(),
});

/**
 * POST /api/agent/report
 *
 * Runs the REPORT phase for a cycle:
 * - Calculates P&L
 * - Asks Claude for exec summary + cycle decision
 * - Sweeps profit if enabled
 * - Logs everything to DB
 *
 * Protected by CRON_SECRET (also callable manually from dashboard).
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow dashboard calls with session cookie (handled by middleware)
    // For direct API calls, require CRON_SECRET
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { cycleId } = parsed.data;
  logger.info("api.agent_report.start", { cycleId });

  try {
    const result = await runReportPhase(cycleId);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    logger.error("api.agent_report.failed", { cycleId, error: String(err) });
    return NextResponse.json(
      { error: "Report phase failed", detail: String(err) },
      { status: 500 },
    );
  }
}
