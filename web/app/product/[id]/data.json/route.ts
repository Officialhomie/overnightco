import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { checkHttp402Gate } from "@/lib/locus/http402";

export const dynamic = "force-dynamic";

/**
 * GET /product/[id]/data.json
 *
 * Machine-readable data report for agent buyers.
 * HTTP 402 gated — agents must pay $0.50 USDC first.
 *
 * Payment flow for agents:
 *   POST /api/product/{id}/subscribe { buyerType: "AGENT" }
 *   → Pay Locus checkout session
 *   POST /api/product/{id}/subscribe/confirm { sessionId }
 *   → Get accessToken
 *   GET /product/{id}/data.json
 *   → Authorization: Bearer <accessToken>
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Check 402 gate
  const gate = await checkHttp402Gate(req, productId, appUrl);
  if (gate) return gate;

  // Fetch product data
  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      niche: products.niche,
      agentJson: products.agentJson,
      researchSources: products.researchSources,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product || !product.agentJson) {
    return NextResponse.json(
      { error: "Product not available" },
      { status: 404 },
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(product.agentJson);
  } catch {
    data = { raw: product.agentJson };
  }

  let sources: string[] = [];
  try {
    sources = product.researchSources ? JSON.parse(product.researchSources) : [];
  } catch {
    sources = [];
  }

  return NextResponse.json(
    {
      product: {
        id: product.id,
        title: product.title,
        niche: product.niche,
        publishedAt: product.publishedAt,
        sources,
      },
      data,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "X-Content-Type": "overnightco-data-v1",
      },
    },
  );
}
