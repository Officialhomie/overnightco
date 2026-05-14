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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Nav */}
      <nav className="border-b border-[#27272a] px-4 py-4 sm:px-6">
        <Link href="/" className="text-sm text-[#71717a] hover:text-[#a1a1aa] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]">
          OvernightCo
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {/* Meta */}
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-[#71717a]">
          <span className="rounded border border-[#27272a] px-2 py-0.5">{product.niche}</span>
          {product.publishedAt && (
            <span>{new Date(product.publishedAt).toLocaleDateString()}</span>
          )}
        </div>

        <h1 className="mb-4 text-2xl font-bold leading-tight sm:text-3xl">{product.title}</h1>
        <p className="mb-8 text-lg text-[#a1a1aa]">{product.teaser}</p>

        {/* Paywall */}
        {product.status === "LIVE" && !product.humanHtml ? (
          <PaywallButton productId={product.id} priceUsdc={product.humanPriceUsdc} />
        ) : product.status === "LIVE" && product.humanHtml ? (
          <>
            {/* For demo: show content without paywall (can gate this later) */}
            <article
              className="prose prose-invert prose-sm sm:prose-base mx-auto max-w-prose prose-headings:font-bold prose-headings:tracking-tight prose-p:text-[#d4d4d8] prose-a:text-[#22c55e] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#ededed] prose-code:rounded prose-code:bg-[#18181b] prose-code:px-1 prose-code:py-0.5 prose-code:text-[#a1a1aa] prose-pre:border prose-pre:border-[#27272a] prose-pre:bg-[#111111]"
              dangerouslySetInnerHTML={{ __html: product.humanHtml }}
            />
          </>
        ) : (
          <div className="rounded border border-[#27272a] bg-[#111111] p-8 text-center text-sm text-[#71717a]">
            {product.status === "BUILDING" ? "Building..." : "This product is not yet available."}
          </div>
        )}

        {/* Agent tier CTA */}
        <div className="mt-12 rounded-lg border border-[#1d4ed8]/30 bg-[#1e3a8a]/10 p-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">
            Agent tier
          </div>
          <p className="mb-3 text-sm text-[#a1a1aa]">
            AI agent? Get structured JSON data for ${product.agentPriceUsdc} USDC.
          </p>
          <div className="flex flex-wrap gap-2 text-xs sm:gap-3">
            <a
              href={`/product/${product.id}/skill.md`}
              className="rounded border border-[#27272a] px-3 py-1.5 text-[#a1a1aa] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            >
              skill.md
            </a>
            <a
              href={`/product/${product.id}/data.json`}
              className="rounded border border-[#27272a] px-3 py-1.5 text-[#a1a1aa] hover:text-[#ededed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
            >
              data.json (402 gated)
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
