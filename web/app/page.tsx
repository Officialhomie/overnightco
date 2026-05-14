import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { allTimePnl } from "@/lib/pnl/calculator";
import { StartForm } from "@/components/landing/start-form";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [pnl, liveProducts] = await Promise.all([
    allTimePnl().catch(() => null),
    db
      .select({
        id: products.id,
        title: products.title,
        niche: products.niche,
        teaser: products.teaser,
        humanPriceUsdc: products.humanPriceUsdc,
        agentPriceUsdc: products.agentPriceUsdc,
        publishedAt: products.publishedAt,
      })
      .from(products)
      .where(eq(products.status, "LIVE"))
      .orderBy(desc(products.publishedAt))
      .limit(6)
      .catch(() => []),
  ]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-24 pt-28 text-center sm:px-6 sm:pb-32 sm:pt-36">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#22c55e]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/8 px-4 py-1.5 text-xs font-medium text-[#22c55e]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#22c55e]" aria-hidden />
            Locus Paygentic Week 4
          </div>

          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Give an AI $20 and a niche.
            <br />
            <span className="text-[#22c55e]">Come back tomorrow.</span>
          </h1>

          <p className="mx-auto mb-12 max-w-lg text-base leading-relaxed text-[#a1a1aa] sm:text-lg">
            It picks the product, prices it, sells it to humans and other agents,
            and pays you the profit.
          </p>

          {/* Stats card */}
          {pnl && (
            <div className="mx-auto mb-12 flex max-w-xs overflow-hidden rounded-xl border border-[#27272a] bg-[#111111] divide-x divide-[#27272a]">
              <div className="flex-1 px-5 py-4 text-center">
                <div className="text-base font-bold text-[#22c55e]">${pnl.revenueUsdc}</div>
                <div className="mt-0.5 text-xs text-[#52525b]">revenue</div>
              </div>
              <div className="flex-1 px-5 py-4 text-center">
                <div className="text-base font-bold text-[#ef4444]">${pnl.costsUsdc}</div>
                <div className="mt-0.5 text-xs text-[#52525b]">costs</div>
              </div>
              <div className="flex-1 px-5 py-4 text-center">
                <div className={`text-base font-bold ${parseFloat(pnl.profitUsdc) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  ${pnl.profitUsdc}
                </div>
                <div className="mt-0.5 text-xs text-[#52525b]">profit</div>
              </div>
            </div>
          )}

          <StartForm />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#27272a] px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-[#52525b]">
            How it works
          </h2>
          {/* Panel grid — gap shows through as 1px borders */}
          <div className="grid gap-px overflow-hidden rounded-xl bg-[#27272a] sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                phase: "01",
                label: "DECIDE",
                desc: "AI scores 3 niche candidates using expected_value = revenue × probability − cost. Picks the winner.",
                color: "text-[#22c55e]",
                dim: "text-[#22c55e]/40",
              },
              {
                phase: "02",
                label: "BUILD",
                desc: "Calls Exa for research (~$0.12) and Claude for writing (~$0.31). Publishes a product with human + agent tiers.",
                color: "text-[#3b82f6]",
                dim: "text-[#3b82f6]/40",
              },
              {
                phase: "03",
                label: "SELL",
                desc: "Humans pay $2.00 for the article. Agents pay $0.50 for raw JSON data via HTTP 402.",
                color: "text-[#f59e0b]",
                dim: "text-[#f59e0b]/40",
              },
              {
                phase: "04",
                label: "REPORT",
                desc: "AI reviews the P&L. Sweeps profit to your wallet. Decides: continue, pivot, or shut down.",
                color: "text-[#a855f7]",
                dim: "text-[#a855f7]/40",
              },
            ].map((step) => (
              <div key={step.phase} className="flex flex-col bg-[#111111] p-6">
                <div className={`mb-1 text-xs font-bold ${step.dim}`}>{step.phase}</div>
                <div className={`mb-3 text-sm font-bold tracking-wide ${step.color}`}>{step.label}</div>
                <p className="text-sm leading-relaxed text-[#71717a]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live products */}
      {liveProducts.length > 0 && (
        <section className="border-t border-[#27272a] px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-[#52525b]">
              Live products
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {liveProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group flex flex-col rounded-xl border border-[#27272a] bg-[#111111] p-5 transition-all duration-150 hover:border-[#22c55e]/25 hover:bg-[#141414]"
                >
                  <div className="mb-2 text-xs uppercase tracking-wider text-[#52525b]">{p.niche}</div>
                  <div className="mb-3 flex-1 text-sm font-semibold leading-snug transition-colors group-hover:text-[#22c55e]">
                    {p.title}
                  </div>
                  <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-[#71717a]">{p.teaser}</p>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-[#22c55e]/10 px-2 py-1 text-xs font-medium text-[#22c55e]">
                      ${p.humanPriceUsdc} human
                    </span>
                    <span className="rounded-md bg-[#3b82f6]/10 px-2 py-1 text-xs font-medium text-[#3b82f6]">
                      ${p.agentPriceUsdc} agent
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#27272a] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-5 text-xs text-[#52525b]">
            <Link href="/api/catalog" className="transition-colors hover:text-[#a1a1aa]">/api/catalog</Link>
            <Link href="/llms.txt" className="transition-colors hover:text-[#a1a1aa]">/llms.txt</Link>
            <Link href="/dashboard" className="transition-colors hover:text-[#a1a1aa]">dashboard</Link>
          </div>
          <div className="text-xs text-[#52525b]">Built for Locus Paygentic Week 4</div>
        </div>
      </footer>
    </main>
  );
}
