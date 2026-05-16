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
        .limit(50),
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
        .limit(10),
      db
        .select()
        .from(businessCycles)
        .orderBy(desc(businessCycles.createdAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

  return (
    <div>
      {/* Sticky content header */}
      <header className="flex justify-between items-center h-16 border-b border-[#3d4a3d] bg-[#0e150e] sticky top-0 z-40 px-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#4be277] tracking-[-0.01em] leading-none">
            P&L Dashboard
          </h1>
          {latestCycle && (
            <p className="font-mono text-[10px] text-[#adc6ff] mt-0.5">
              Active Niche: {latestCycle.ownerInput}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {latestCycle?.cycleDecision && (
            <div className="hidden lg:flex items-center gap-2 bg-[#242c24] border border-[#3d4a3d] px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-[#4be277] rounded-full pulse-dot" />
              <span className="font-mono text-[10px] text-[#4be277]">
                Cycle: {latestCycle.cycleDecision}
              </span>
            </div>
          )}
          <span className="material-symbols-outlined text-[#bccbb9] cursor-pointer hover:text-[#4be277] transition-colors">
            notifications_active
          </span>
        </div>
      </header>

      <div className="px-6 py-6">
        {/* Performance snapshot */}
        <section className="mb-8">
          <PnlCards today={today} allTime={allTime} />
        </section>

        {/* Decision log + Transaction feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DecisionLog decisions={recentDecisions} />
          <TransactionFeed transactions={recentTransactions} />
        </div>

        {/* Autonomous Portfolio */}
        {liveProducts.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-[#bccbb9] text-base">grid_view</span>
              <span className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-widest">
                Autonomous Portfolio
              </span>
            </div>

            <div className="bg-[#1a221a] border border-[#3d4a3d] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[#242c24] border-b border-[#3d4a3d]">
                  <tr>
                    <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-left">
                      Product Name
                    </th>
                    <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-left">
                      Status
                    </th>
                    <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-right hidden sm:table-cell">
                      Build Cost
                    </th>
                    <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-right hidden md:table-cell">
                      Published
                    </th>
                    <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-right">
                      Link
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3d4a3d]">
                  {liveProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#2f372e] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[12px] text-[#dce5d9] truncate max-w-[220px]">
                          {p.title}
                        </div>
                        <div className="font-mono text-[10px] text-[#869585]">{p.niche}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4be277] pulse-dot" />
                          <span className="font-mono text-[10px] text-[#4be277] uppercase">
                            {p.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <span className="font-mono text-[12px] text-[#bccbb9]">
                          ${p.totalCostUsdc}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="font-mono text-[10px] text-[#869585]">
                          {p.publishedAt
                            ? new Date(p.publishedAt).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/product/${p.id}`}
                          className="font-mono text-[10px] text-[#adc6ff] hover:text-[#4be277] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
