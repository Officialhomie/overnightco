import "server-only";

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog
 *
 * Machine-readable product catalog for agent discovery.
 * Open to all — no authentication required.
 *
 * Agents use this to find purchasable data products.
 */
export async function GET(req: Request) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const liveProducts = await db
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
    .limit(50);

  const catalog = liveProducts.map((p) => ({
    id: p.id,
    title: p.title,
    niche: p.niche,
    teaser: p.teaser,
    pricing: {
      human: { price: p.humanPriceUsdc, currency: "USDC", url: `${appUrl}/product/${p.id}` },
      agent: {
        price: p.agentPriceUsdc,
        currency: "USDC",
        dataUrl: `${appUrl}/product/${p.id}/data.json`,
        skillUrl: `${appUrl}/product/${p.id}/skill.md`,
        subscribeUrl: `${appUrl}/api/product/${p.id}/subscribe`,
        confirmUrl: `${appUrl}/api/product/${p.id}/subscribe/confirm`,
      },
    },
    publishedAt: p.publishedAt,
  }));

  return NextResponse.json(
    {
      protocol: "overnightco-catalog-v1",
      description: "AI-published intelligence products. Pay $0.50 USDC for machine-readable data.",
      discovery: `${appUrl}/llms.txt`,
      products: catalog,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    },
  );
}
