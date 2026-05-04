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
      <section className="border-b border-[#27272a] px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-block rounded border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1 text-xs text-[#22c55e]">
            Locus Paygentic Week 4
          </div>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Give an AI $20 and a niche.
            <br />
            <span className="text-[#22c55e]">Come back tomorrow.</span>
          </h1>
          <p className="mb-8 text-lg text-[#a1a1aa]">
            It picks the product, prices it, sells it to humans and other agents,
            and pays you the profit.
          </p>

          {/* Stats bar */}
          {pnl && (
            <div className="mb-10 flex justify-center gap-8 text-sm">
              <div>
                <div className="text-[#22c55e] font-bold">${pnl.revenueUsdc}</div>
                <div className="text-[#71717a]">revenue</div>
              </div>
              <div className="border-l border-[#27272a]" />
              <div>
                <div className="text-[#ef4444] font-bold">${pnl.costsUsdc}</div>
                <div className="text-[#71717a]">costs</div>
              </div>
              <div className="border-l border-[#27272a]" />
              <div>
                <div className={`font-bold ${parseFloat(pnl.profitUsdc) >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  ${pnl.profitUsdc}
                </div>
                <div className="text-[#71717a]">profit</div>
              </div>
            </div>
          )}

          <StartForm />
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[#27272a] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-10 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
            How it works
          </h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              {
                phase: "01",
                label: "DECIDE",
                desc: "AI scores 3 niche candidates using expected_value = revenue × probability − cost. Picks the winner.",
                color: "text-[#22c55e]",
              },
              {
                phase: "02",
                label: "BUILD",
                desc: "Calls Exa for research (~$0.12) and Claude for writing (~$0.31). Publishes a product with human + agent tiers.",
                color: "text-[#3b82f6]",
              },
              {
                phase: "03",
                label: "SELL",
                desc: "Humans pay $2.00 for the article. Agents pay $0.50 for raw JSON data via HTTP 402.",
                color: "text-[#f59e0b]",
              },
              {
                phase: "04",
                label: "REPORT",
                desc: "AI reviews the P&L. Sweeps profit to your wallet. Decides: continue, pivot, or shut down.",
                color: "text-[#a855f7]",
              },
            ].map((step) => (
              <div key={step.phase} className="rounded-lg border border-[#27272a] bg-[#111111] p-4">
                <div className={`mb-2 font-bold ${step.color}`}>{step.phase} — {step.label}</div>
                <p className="text-sm text-[#a1a1aa]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live products */}
      {liveProducts.length > 0 && (
        <section className="border-b border-[#27272a] px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
              Live products
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {liveProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group rounded-lg border border-[#27272a] bg-[#111111] p-4 transition-colors hover:border-[#3f3f46] hover:bg-[#1a1a1a]"
                >
                  <div className="mb-1 text-xs text-[#71717a]">{p.niche}</div>
                  <div className="mb-2 font-semibold leading-snug group-hover:text-[#22c55e]">
                    {p.title}
                  </div>
                  <p className="mb-3 text-sm text-[#a1a1aa] line-clamp-2">{p.teaser}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-[#22c55e]">${p.humanPriceUsdc} human</span>
                    <span className="text-[#71717a]">·</span>
                    <span className="text-[#3b82f6]">${p.agentPriceUsdc} agent</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs text-[#71717a]">
        <div className="flex justify-center gap-4">
          <Link href="/api/catalog" className="hover:text-[#a1a1aa]">/api/catalog</Link>
          <Link href="/llms.txt" className="hover:text-[#a1a1aa]">/llms.txt</Link>
          <Link href="/dashboard" className="hover:text-[#a1a1aa]">dashboard</Link>
        </div>
        <div className="mt-3">Built for Locus Paygentic Week 4</div>
      </footer>
    </main>
  );
}
