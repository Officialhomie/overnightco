import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { allTimePnl } from "@/lib/pnl/calculator";
import { StartForm } from "@/components/landing/start-form";
import { TopNav } from "@/components/landing/top-nav";
import { MobileBottomNav } from "@/components/landing/mobile-bottom-nav";

export const dynamic = "force-dynamic";

const CYCLE_STEPS = [
  {
    phase: "01",
    label: "DECIDE",
    desc: "Agent analyzes niche saturation, intent signals, and keyword arbitrage opportunities.",
    color: "text-[#4be277]",
    dim: "text-[#4ae176]/40",
  },
  {
    phase: "02",
    label: "BUILD",
    desc: "Dynamic generation of landing pages, API integrations, and content architectures.",
    color: "text-[#adc6ff]",
    dim: "text-[#adc6ff]/40",
  },
  {
    phase: "03",
    label: "SELL",
    desc: "Automated distribution across social graphs, ad-networks, and niche directories.",
    color: "text-[#ffba61]",
    dim: "text-[#ffb95f]/40",
  },
  {
    phase: "04",
    label: "REPORT",
    desc: "Live P&L updates streamed to terminal. Profits reinvested or withdrawn to owner.",
    color: "text-[#b085ff]",
    dim: "text-[#b085ff]/40",
  },
] as const;

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
    <>
      <TopNav />

      <main className="max-w-[896px] mx-auto px-4 sm:px-6 pt-32 pb-16">

        {/* Hero */}
        <section className="mb-16">
          <div className="inline-flex items-center gap-2 border border-[#3d4a3d] bg-[#161d16] px-3 py-1 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#4be277] pulse-dot" aria-hidden />
            <span className="text-[10px] text-[#4be277] uppercase tracking-widest font-mono">
              Locus Paygentic Week 4
            </span>
          </div>

          <h1 className="text-[40px] leading-[1.1] font-bold mb-8 max-w-2xl text-[#dce5d9]">
            Give an AI $20 and a niche.
            <br />
            <span className="text-[#4be277]">Come back tomorrow.</span>
          </h1>
        </section>

        {/* Live P&L Card */}
        {pnl && (
          <section className="mb-12 border border-[#3d4a3d] bg-[#091009] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#3d4a3d]">
            <div className="p-6">
              <div className="text-[10px] text-[#bccbb9] mb-2 uppercase tracking-tighter font-mono">
                Total Revenue
              </div>
              <div className="text-xl font-bold text-[#4be277] flex items-baseline gap-1">
                ${pnl.revenueUsdc}
                <span className="material-symbols-outlined text-sm">trending_up</span>
              </div>
            </div>
            <div className="p-6">
              <div className="text-[10px] text-[#bccbb9] mb-2 uppercase tracking-tighter font-mono">
                Ops Costs
              </div>
              <div className="text-xl font-bold text-[#ffb4ab] flex items-baseline gap-1">
                ${pnl.costsUsdc}
                <span className="material-symbols-outlined text-sm">payments</span>
              </div>
            </div>
            <div className="p-6 bg-[#1a221a]">
              <div className="text-[10px] text-[#bccbb9] mb-2 uppercase tracking-tighter font-mono">
                System Profit
              </div>
              <div
                className={`text-xl font-bold flex items-baseline gap-1 ${
                  parseFloat(pnl.profitUsdc) >= 0 ? "text-[#6bff8f]" : "text-[#ffb4ab]"
                }`}
              >
                ${pnl.profitUsdc}
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
                >
                  stars
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Start Form */}
        <section className="mb-20">
          <StartForm />
        </section>

        {/* Autonomous Cycle */}
        <section className="mb-20">
          <div className="mb-8 flex items-center gap-4">
            <h2 className="text-base font-semibold text-[#dce5d9] whitespace-nowrap">
              AUTONOMOUS CYCLE
            </h2>
            <div className="h-px flex-1 bg-[#3d4a3d]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-[#3d4a3d] border border-[#3d4a3d]">
            {CYCLE_STEPS.map((step) => (
              <div
                key={step.phase}
                className="bg-[#091009] p-6 hover:bg-[#161d16] transition-colors"
              >
                <div className={`font-mono mb-8 ${step.dim}`}>{step.phase}</div>
                <h3 className={`text-sm font-semibold mb-2 ${step.color}`}>{step.label}</h3>
                <p className="text-xs leading-relaxed text-[#bccbb9]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Live Deployments */}
        {liveProducts.length > 0 && (
          <section className="mb-12">
            <div className="mb-8 flex items-center gap-4">
              <h2 className="text-base font-semibold text-[#dce5d9] uppercase whitespace-nowrap">
                Live Deployments
              </h2>
              <div className="flex-1 h-px bg-[#3d4a3d]" />
              <span className="text-[10px] font-mono text-[#4be277] whitespace-nowrap">
                {liveProducts.length} ACTIVE AGENTS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group border border-[#3d4a3d] bg-[#091009] p-6 hover:border-[#4be277] transition-all cursor-pointer flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] border border-[#adc6ff] text-[#adc6ff] px-1.5 font-mono uppercase">
                      {p.niche}
                    </span>
                    <span className="material-symbols-outlined text-[#869585] group-hover:text-[#4be277] transition-colors">
                      arrow_outward
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#dce5d9] group-hover:text-[#4be277] mb-2 transition-colors flex-1">
                    {p.title}
                  </h4>
                  <p className="text-xs text-[#bccbb9] mb-6 h-12 overflow-hidden leading-relaxed">
                    {p.teaser}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-[#ef9900]/10 text-[#ffba61] px-2 py-1 text-[10px] font-mono uppercase">
                      ${p.humanPriceUsdc} HUMAN
                    </span>
                    <span className="bg-[#0566d9]/10 text-[#adc6ff] px-2 py-1 text-[10px] font-mono uppercase">
                      ${p.agentPriceUsdc} AGENT
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#3d4a3d] bg-[#091009]">
        <div className="max-w-[896px] mx-auto py-4 px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap gap-6 text-xs text-[#bccbb9] font-mono">
            <Link href="/api/catalog" className="hover:text-[#4be277] transition-colors">
              Architecture
            </Link>
            <Link href="/llms.txt" className="hover:text-[#4be277] transition-colors">
              Privacy Protocol
            </Link>
            <Link href="/dashboard" className="hover:text-[#4be277] transition-colors">
              API Docs
            </Link>
            <span className="text-[#869585]">© 2024 OvernightCo. System autonomous.</span>
          </div>
          <div className="text-xs font-mono text-[#bccbb9] bg-[#1a221a] px-4 py-2 border border-[#3d4a3d] whitespace-nowrap">
            Built for <span className="text-[#4be277]">Locus Paygentic Week 4</span>
          </div>
        </div>
      </footer>

      <MobileBottomNav />
    </>
  );
}
