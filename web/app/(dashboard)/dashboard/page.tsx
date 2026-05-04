import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { businessCycles, aiDecisions, transactions, products } from "@/lib/db/schema";
import { todayPnl, allTimePnl } from "@/lib/pnl/calculator";
import { PnlCards } from "@/components/dashboard/pnl-cards";
import { DecisionLog } from "@/components/dashboard/decision-log";
import { TransactionFeed } from "@/components/dashboard/transaction-feed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [today, allTime, recentDecisions, recentTransactions, liveProducts, latestCycle] =
    await Promise.all([
      todayPnl(),
      allTimePnl(),
      db
        .select()
        .from(aiDecisions)
        .orderBy(desc(aiDecisions.createdAt))
        .limit(15),
      db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.occurredAt))
        .limit(30),
      db
        .select({
          id: products.id,
          title: products.title,
          niche: products.niche,
          status: products.status,
          totalCostUsdc: products.totalCostUsdc,
          publishedAt: products.publishedAt,
        })
        .from(products)
        .where(eq(products.status, "LIVE"))
        .orderBy(desc(products.publishedAt))
        .limit(5),
      db
        .select()
        .from(businessCycles)
        .orderBy(desc(businessCycles.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold">P&L Dashboard</h1>
        {latestCycle && (
          <p className="mt-1 text-sm text-[#71717a]">
            Current niche: {latestCycle.ownerInput}
            {latestCycle.cycleDecision && (
              <span className="ml-3 rounded border border-[#27272a] px-2 py-0.5 text-xs">
                {latestCycle.cycleDecision}
              </span>
            )}
          </p>
        )}
      </div>

      {/* P&L cards */}
      <PnlCards today={today} allTime={allTime} />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* AI Decision log */}
        <DecisionLog decisions={recentDecisions} />

        {/* Transaction feed */}
        <TransactionFeed transactions={recentTransactions} />
      </div>

      {/* Live products */}
      {liveProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
            Live products
          </h2>
          <div className="overflow-hidden rounded-lg border border-[#27272a]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#111111]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#71717a]">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#71717a]">Niche</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#71717a]">Build cost</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#71717a]">Published</th>
                </tr>
              </thead>
              <tbody>
                {liveProducts.map((p) => (
                  <tr key={p.id} className="border-b border-[#27272a] last:border-0 hover:bg-[#111111]">
                    <td className="px-4 py-3">
                      <a href={`/product/${p.id}`} className="text-[#22c55e] hover:underline">
                        {p.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{p.niche}</td>
                    <td className="px-4 py-3 text-right text-[#a1a1aa]">${p.totalCostUsdc}</td>
                    <td className="px-4 py-3 text-right text-[#71717a]">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
