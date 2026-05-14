import { desc, eq } from "drizzle-orm";
import Link from "next/link";

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
    <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold">P&L Dashboard</h1>
        {latestCycle && (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#71717a]">
            <span>
              Current niche: {latestCycle.ownerInput}
            </span>
            {latestCycle.cycleDecision && (
              <span className="rounded border border-[#27272a] px-2 py-0.5 text-xs">
                {latestCycle.cycleDecision}
              </span>
            )}
          </p>
        )}
      </div>

      <PnlCards today={today} allTime={allTime} />

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <DecisionLog decisions={recentDecisions} />
        <TransactionFeed transactions={recentTransactions} />
      </div>

      {liveProducts.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
            Live products
          </h2>

          <div className="space-y-3 md:hidden">
            {liveProducts.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="block rounded-lg border border-[#27272a] bg-[#111111] p-4 transition-colors hover:border-[#3f3f46] hover:bg-[#1a1a1a]"
              >
                <div className="mb-1 text-xs text-[#71717a]">{p.niche}</div>
                <div className="mb-2 font-medium text-[#22c55e]">{p.title}</div>
                <div className="flex flex-wrap justify-between gap-2 text-xs text-[#a1a1aa]">
                  <span>Build ${p.totalCostUsdc}</span>
                  <span className="text-[#71717a]">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-lg border border-[#27272a] md:block">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-[#27272a] bg-[#111111]">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                    Niche
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                    Build cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#71717a]">
                    Published
                  </th>
                </tr>
              </thead>
              <tbody>
                {liveProducts.map((p) => (
                  <tr key={p.id} className="border-b border-[#27272a] last:border-0 hover:bg-[#111111]">
                    <td className="px-4 py-3">
                      <Link href={`/product/${p.id}`} className="text-[#22c55e] hover:underline">
                        {p.title}
                      </Link>
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
