import "server-only";

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { businessCycles, products, aiDecisions, transactions } from "@/lib/db/schema";
import { todayPnl, allTimePnl } from "@/lib/pnl/calculator";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/stats
 *
 * Returns live P&L summary + recent activity for the dashboard.
 * Protected by middleware (session required).
 */
export async function GET() {
  try {
    const [today, allTime] = await Promise.all([
      todayPnl(),
      allTimePnl(),
    ]);

    // Recent transactions (last 20)
    const recentTransactions = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amountUsdc: transactions.amountUsdc,
        description: transactions.description,
        occurredAt: transactions.occurredAt,
        buyerType: transactions.buyerType,
      })
      .from(transactions)
      .orderBy(desc(transactions.occurredAt))
      .limit(20);

    // Recent AI decisions (last 10)
    const recentDecisions = await db
      .select({
        id: aiDecisions.id,
        phase: aiDecisions.phase,
        decision: aiDecisions.decision,
        costUsdc: aiDecisions.costUsdc,
        createdAt: aiDecisions.createdAt,
      })
      .from(aiDecisions)
      .orderBy(desc(aiDecisions.createdAt))
      .limit(10);

    // Active products
    const liveProducts = await db
      .select({
        id: products.id,
        title: products.title,
        niche: products.niche,
        status: products.status,
        humanPriceUsdc: products.humanPriceUsdc,
        agentPriceUsdc: products.agentPriceUsdc,
        totalCostUsdc: products.totalCostUsdc,
        publishedAt: products.publishedAt,
      })
      .from(products)
      .where(eq(products.status, "LIVE"))
      .orderBy(desc(products.publishedAt))
      .limit(10);

    // Most recent cycle
    const [latestCycle] = await db
      .select({
        id: businessCycles.id,
        ownerInput: businessCycles.ownerInput,
        cycleDecision: businessCycles.cycleDecision,
        cycleReason: businessCycles.cycleReason,
        profitSweptUsdc: businessCycles.profitSweptUsdc,
        startedAt: businessCycles.startedAt,
        endedAt: businessCycles.endedAt,
      })
      .from(businessCycles)
      .orderBy(desc(businessCycles.createdAt))
      .limit(1);

    return NextResponse.json({
      today,
      allTime,
      recentTransactions,
      recentDecisions,
      liveProducts,
      latestCycle: latestCycle ?? null,
    });
  } catch (err) {
    logger.error("api.dashboard_stats.failed", { error: String(err) });
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
