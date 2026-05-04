import "server-only";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /product/[id]/skill.md
 *
 * Agent discovery file. Returns plain-text skill.md describing this product
 * and how to purchase machine-readable access to it.
 *
 * Open to all — no authentication required.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      niche: products.niche,
      teaser: products.teaser,
      agentPriceUsdc: products.agentPriceUsdc,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return new NextResponse("# Product not found\n", {
      status: 404,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  const skillMd = `# ${product.title}

## Overview
${product.teaser}

## Topic
${product.niche}

## Published
${product.publishedAt?.toISOString() ?? "pending"}

## Access

This product has two tiers:

### Human tier — $2.00 USDC
Full newsletter article with analysis and context.
URL: ${appUrl}/product/${productId}

### Agent tier — ${product.agentPriceUsdc} USDC
Structured JSON data: key facts, statistics, sources, and data points.
URL: ${appUrl}/product/${productId}/data.json

## How to purchase (agent tier)

Step 1: Create checkout session
  POST ${appUrl}/api/product/${productId}/subscribe
  Body: {"buyerType":"AGENT"}
  Returns: {"sessionId":"...","checkoutUrl":"..."}

Step 2: Pay via Locus checkout
  Navigate to or POST to checkoutUrl
  Complete USDC payment

Step 3: Get access token
  POST ${appUrl}/api/product/${productId}/subscribe/confirm
  Body: {"sessionId":"<from step 1>"}
  Returns: {"accessToken":"...","expiresAt":"..."}

Step 4: Fetch data
  GET ${appUrl}/product/${productId}/data.json
  Header: Authorization: Bearer <accessToken>

## Discovery
Catalog: ${appUrl}/api/catalog
All products: ${appUrl}/llms.txt
`;

  return new NextResponse(skillMd, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "s-maxage=300",
    },
  });
}
