import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import Link from "next/link";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { PaywallButton } from "@/components/product/paywall-button";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) notFound();

  const publishedLabel = product.publishedAt
    ? new Date(product.publishedAt)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, ".")
        .concat("_04:00_UTC")
    : null;

  return (
    <main className="min-h-screen bg-[#0e150e] text-[#dce5d9]">
      {/* Top nav */}
      <header className="fixed top-0 left-0 w-full z-50 h-14 border-b border-[#3d4a3d] bg-[#0e150e]/80 backdrop-blur-md flex items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
        >
          <span className="material-symbols-outlined text-[#4be277] group-hover:-translate-x-1 transition-transform">
            arrow_back
          </span>
          <span className="font-mono font-bold text-[#4be277] tracking-tighter uppercase text-base">
            OvernightCo
          </span>
        </Link>
        <div className="flex items-center gap-2 px-3 py-1 bg-[#161d16] border border-[#3d4a3d] rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4be277] pulse-dot" />
          <span className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-widest">
            Network Live
          </span>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-6 pt-32 pb-40">
        {/* Header section */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-2 py-0.5 bg-[#242c24] border border-[#3d4a3d] text-[#4be277] font-mono text-[10px] rounded uppercase tracking-wider">
              Market Analysis
            </span>
            {publishedLabel && (
              <span className="text-[#bccbb9] font-mono text-[10px] border-l border-[#3d4a3d] pl-3">
                PUBLISHED: {publishedLabel}
              </span>
            )}
          </div>
          <h1 className="text-[24px] leading-[32px] tracking-[-0.02em] font-bold border-l-4 border-[#4be277] pl-6 mb-6">
            {product.title}
          </h1>
          <p className="text-[16px] text-[#bccbb9] leading-relaxed">
            {product.teaser}
          </p>
        </section>

        {/* Content */}
        {product.status === "LIVE" && !product.humanHtml ? (
          <PaywallButton productId={product.id} priceUsdc={product.humanPriceUsdc} />
        ) : product.status === "LIVE" && product.humanHtml ? (
          <article
            className="prose-dark font-mono text-sm mb-16"
            dangerouslySetInnerHTML={{ __html: product.humanHtml }}
          />
        ) : (
          <div className="border border-[#3d4a3d] bg-[#161d16] p-8 text-center text-sm text-[#869585]">
            {product.status === "BUILDING" ? "Building..." : "This product is not yet available."}
          </div>
        )}

        {/* Agent tier panel */}
        <section className="p-6 bg-[#091009] border border-[#0566d9]/30 rounded-lg mt-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#adc6ff]">smart_toy</span>
                <span className="text-[#adc6ff] font-mono text-[10px] uppercase tracking-[0.2em] font-bold">
                  Agent tier
                </span>
              </div>
              <div>
                <p className="font-mono text-[13px] text-[#dce5d9]">
                  RAW_LOGS: ${product.agentPriceUsdc} USDC
                </p>
                <p className="font-mono text-[12px] text-[#bccbb9]">
                  Access raw JSON data structures for programmatic consumption.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/product/${product.id}/skill.md`}
                className="px-4 py-2 border border-[#3d4a3d] text-[#dce5d9] font-mono text-[13px] rounded flex items-center gap-2 hover:bg-[#242c24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
              >
                <span className="material-symbols-outlined text-base">description</span>
                skill.md
              </a>
              <a
                href={`/product/${product.id}/data.json`}
                className="px-4 py-2 bg-[#0566d9] text-white font-mono text-[13px] rounded flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#adc6ff]"
              >
                <span className="material-symbols-outlined text-base">lock</span>
                data.json (402 gated)
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-[#3d4a3d] bg-[#091009] py-4">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 max-w-[800px] mx-auto gap-4">
          <span className="font-mono text-[10px] text-[#bccbb9] uppercase">
            © 2024 OvernightCo. System autonomous.
          </span>
          <nav className="flex gap-6">
            <a href="#" className="font-mono text-[10px] text-[#bccbb9] hover:text-[#4be277] transition-colors uppercase">
              Architecture
            </a>
            <a href="#" className="font-mono text-[10px] text-[#bccbb9] hover:text-[#4be277] transition-colors uppercase">
              Privacy Protocol
            </a>
            <a href="#" className="font-mono text-[10px] text-[#bccbb9] hover:text-[#4be277] transition-colors uppercase">
              API Docs
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
