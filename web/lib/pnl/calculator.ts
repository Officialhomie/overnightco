import "server-only";

import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export interface PnlResult {
  periodStart: Date;
  periodEnd: Date;
  revenueUsdc: string;
  costsUsdc: string;
  profitUsdc: string;
  revenueByType: {
    human: string;
    agent: string;
  };
  costsByType: {
    exa: string;
    claude: string;
    stability: string;
    build: string;
    other: string;
  };
  transactionCount: number;
}

/**
 * Calculate P&L for a given time period.
 * Revenue = sum of REVENUE_* transactions
 * Costs = sum of COST_* transactions
 * Profit = revenue - costs
 */
export async function calculatePnl(opts: {
  since: Date;
  until?: Date;
}): Promise<PnlResult> {
  const until = opts.until ?? new Date();

  const rows = await db
    .select({
      type: transactions.type,
      total: sql<string>`COALESCE(SUM(CAST(${transactions.amountUsdc} AS DECIMAL)), 0)::text`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.occurredAt, opts.since),
        lte(transactions.occurredAt, until),
      ),
    )
    .groupBy(transactions.type);

  const totals: Record<string, number> = {};
  let totalCount = 0;
  for (const row of rows) {
    totals[row.type] = parseFloat(row.total ?? "0");
    totalCount += row.count ?? 0;
  }

  const revenueHuman = totals["REVENUE_HUMAN"] ?? 0;
  const revenueAgent = totals["REVENUE_AGENT"] ?? 0;
  const totalRevenue = revenueHuman + revenueAgent;

  const costExa = totals["COST_EXA"] ?? 0;
  const costClaude = totals["COST_CLAUDE"] ?? 0;
  const costStability = totals["COST_STABILITY"] ?? 0;
  const costBuild = totals["COST_BUILD"] ?? 0;
  const costOther = totals["COST_OTHER"] ?? 0;
  const totalCosts = costExa + costClaude + costStability + costBuild + costOther;

  const profit = totalRevenue - totalCosts;

  return {
    periodStart: opts.since,
    periodEnd: until,
    revenueUsdc: totalRevenue.toFixed(2),
    costsUsdc: totalCosts.toFixed(2),
    profitUsdc: profit.toFixed(2),
    revenueByType: {
      human: revenueHuman.toFixed(2),
      agent: revenueAgent.toFixed(2),
    },
    costsByType: {
      exa: costExa.toFixed(4),
      claude: costClaude.toFixed(4),
      stability: costStability.toFixed(4),
      build: costBuild.toFixed(4),
      other: costOther.toFixed(4),
    },
    transactionCount: totalCount,
  };
}

/** P&L for today (midnight to now). */
export async function todayPnl(): Promise<PnlResult> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return calculatePnl({ since: today });
}

/** All-time P&L. */
export async function allTimePnl(): Promise<PnlResult> {
  return calculatePnl({ since: new Date(0) });
}
