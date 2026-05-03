import "server-only";

import { db } from "@/lib/db";
import {
  businessCycles,
  payouts,
  transactions,
  aiDecisions,
  newsletterSettings,
} from "@/lib/db/schema";
import { calculatePnl } from "@/lib/pnl/calculator";
import { sendUsdcToWallet } from "@/lib/locus/pay-send";
import { callClaude } from "@/lib/locus/wrapped-apis";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

export interface ReportResult {
  cycleDecision: "CONTINUE" | "PIVOT" | "SHUTDOWN";
  cycleReason: string;
  pnl: {
    revenueUsdc: string;
    costsUsdc: string;
    profitUsdc: string;
  };
  payoutSent: boolean;
  payoutAmountUsdc: string;
  summary: string;
  costUsdc: string;
}

/**
 * Run the REPORT phase:
 * 1. Calculate cycle P&L
 * 2. Ask Claude for an exec summary + cycle decision (CONTINUE/PIVOT/SHUTDOWN)
 * 3. If profit > threshold and payout enabled, sweep funds to owner wallet
 * 4. Log everything to aiDecisions + businessCycles
 */
export async function runReportPhase(cycleId: string): Promise<ReportResult> {
  logger.info("agent.report.start", { cycleId });

  // Fetch cycle start time + settings
  const [cycle] = await db
    .select({
      startedAt: businessCycles.startedAt,
      ownerInput: businessCycles.ownerInput,
    })
    .from(businessCycles)
    .where(eq(businessCycles.id, cycleId))
    .limit(1);

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  const [settings] = await db.select().from(newsletterSettings).limit(1);
  const payoutWallet = settings?.payoutWalletAddress ?? null;
  const isPayoutEnabled = settings?.isPayoutEnabled ?? false;
  const payoutThreshold = parseFloat(settings?.payoutThresholdUsdc ?? "5.00");

  // Calculate P&L for this cycle
  const pnl = await calculatePnl({ since: cycle.startedAt });

  const profit = parseFloat(pnl.profitUsdc);
  const revenue = parseFloat(pnl.revenueUsdc);
  const costs = parseFloat(pnl.costsUsdc);
  const marginPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0";

  // Ask Claude for exec summary and cycle decision
  const reportPrompt = `You are an autonomous business agent reviewing your performance.

Niche: "${cycle.ownerInput}"
Cycle Duration: ${Math.round((Date.now() - cycle.startedAt.getTime()) / 3600000)} hours

P&L Summary:
- Revenue: $${pnl.revenueUsdc} USDC (human: $${pnl.revenueByType.human}, agent: $${pnl.revenueByType.agent})
- Costs: $${pnl.costsUsdc} USDC (exa: $${pnl.costsByType.exa}, claude: $${pnl.costsByType.claude}, build: $${pnl.costsByType.build})
- Profit: $${pnl.profitUsdc} USDC (${marginPct}% margin)
- Transactions: ${pnl.transactionCount}

Make a cycle decision: CONTINUE (profitable, keep publishing), PIVOT (low return, try new niche), or SHUTDOWN (unviable).

Return ONLY this JSON:
{
  "cycle_decision": "CONTINUE" | "PIVOT" | "SHUTDOWN",
  "cycle_reason": "one sentence explanation (max 200 chars)",
  "summary": "exec summary: what worked, what didn't, key insight (max 400 chars)"
}`;

  const reportResult = await callClaude(reportPrompt, {
    cycleId,
    systemPrompt: "You are an autonomous business agent. Be concise and economically rational. Return only valid JSON.",
    maxTokens: 400,
  });

  let parsed: {
    cycle_decision: "CONTINUE" | "PIVOT" | "SHUTDOWN";
    cycle_reason: string;
    summary: string;
  };

  try {
    let json = reportResult.data.trim();
    const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) json = match[1].trim();
    parsed = JSON.parse(json);
  } catch {
    // Fallback based on profit
    const decision = profit > 0 ? "CONTINUE" : profit < -1 ? "SHUTDOWN" : "PIVOT";
    parsed = {
      cycle_decision: decision,
      cycle_reason: `Fallback: profit is $${pnl.profitUsdc} USDC`,
      summary: `Revenue $${pnl.revenueUsdc}, costs $${pnl.costsUsdc}, profit $${pnl.profitUsdc}.`,
    };
  }

  // Payout: sweep profit to owner wallet if above threshold
  let payoutSent = false;
  let payoutAmountUsdc = "0.00";
  let locusTransactionId: string | undefined;
  const now = new Date();

  if (isPayoutEnabled && payoutWallet && profit >= payoutThreshold) {
    try {
      const sendResult = await sendUsdcToWallet(
        payoutWallet,
        profit,
        `OvernightCo cycle profit — ${cycle.ownerInput}`,
      );
      locusTransactionId = sendResult.transactionId;
      payoutAmountUsdc = profit.toFixed(2);
      payoutSent = true;

      // Record payout row
      await db.insert(payouts).values({
        cycleId,
        toWalletAddress: payoutWallet,
        amountUsdc: payoutAmountUsdc,
        revenueUsdc: pnl.revenueUsdc,
        costsUsdc: pnl.costsUsdc,
        locusTransactionId,
        status: "SENT",
        periodStart: cycle.startedAt,
        periodEnd: now,
        sentAt: now,
      });

      // Insert PAYOUT transaction to ledger
      await db.insert(transactions).values({
        type: "PAYOUT",
        amountUsdc: payoutAmountUsdc,
        cycleId,
        locusTransactionId,
        description: `Profit sweep to ${payoutWallet.slice(0, 10)}…`,
        metadata: JSON.stringify({ toAddress: payoutWallet }),
      });

      logger.info("agent.report.payout_sent", { payoutAmountUsdc, locusTransactionId });
    } catch (err) {
      logger.error("agent.report.payout_failed", { error: String(err) });
      // Record failed payout row
      await db.insert(payouts).values({
        cycleId,
        toWalletAddress: payoutWallet,
        amountUsdc: profit.toFixed(2),
        revenueUsdc: pnl.revenueUsdc,
        costsUsdc: pnl.costsUsdc,
        status: "FAILED",
        failureReason: String(err),
        periodStart: cycle.startedAt,
        periodEnd: now,
      });
    }
  }

  // Log REPORT decision to aiDecisions
  await db.insert(aiDecisions).values({
    cycleId,
    phase: "REPORT",
    prompt: reportPrompt.slice(0, 2000),
    reasoning: JSON.stringify({
      revenueUsdc: pnl.revenueUsdc,
      costsUsdc: pnl.costsUsdc,
      profitUsdc: pnl.profitUsdc,
      marginPct,
      payoutSent,
    }),
    decision: `${parsed.cycle_decision}: ${parsed.cycle_reason}`,
    costUsdc: reportResult.costUsdc,
  });

  // Update businessCycles with decision + profit swept
  await db
    .update(businessCycles)
    .set({
      cycleDecision: parsed.cycle_decision,
      cycleReason: parsed.cycle_reason,
      profitSweptUsdc: payoutSent ? payoutAmountUsdc : null,
      sweptAt: payoutSent ? now : null,
      endedAt: now,
    })
    .where(eq(businessCycles.id, cycleId));

  logger.info("agent.report.complete", {
    cycleId,
    cycleDecision: parsed.cycle_decision,
    profitUsdc: pnl.profitUsdc,
    payoutSent,
  });

  return {
    cycleDecision: parsed.cycle_decision,
    cycleReason: parsed.cycle_reason,
    pnl: {
      revenueUsdc: pnl.revenueUsdc,
      costsUsdc: pnl.costsUsdc,
      profitUsdc: pnl.profitUsdc,
    },
    payoutSent,
    payoutAmountUsdc,
    summary: parsed.summary,
    costUsdc: reportResult.costUsdc,
  };
}
