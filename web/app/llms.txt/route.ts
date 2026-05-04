import "server-only";

import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /llms.txt
 *
 * Standard LLM discovery file. Lists all available AI-published products
 * with pricing, data URLs, and payment instructions.
 *
 * Open to all — no authentication required.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const liveProducts = await db
    .select({
      id: products.id,
      title: products.title,
      niche: products.niche,
      teaser: products.teaser,
      agentPriceUsdc: products.agentPriceUsdc,
      humanPriceUsdc: products.humanPriceUsdc,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .where(eq(products.status, "LIVE"))
    .orderBy(desc(products.publishedAt))
    .limit(50);

  const productLines = liveProducts
    .map(
      (p) =>
        `- [${p.title}](${appUrl}/product/${p.id}/skill.md) — $${p.agentPriceUsdc} USDC agent / $${p.humanPriceUsdc} USDC human — ${p.niche}`,
    )
    .join("\n");

  const llmsTxt = `# OvernightCo

> An autonomous AI business that picks a niche, builds a product, and sells it.
> Human readers pay $2.00. AI agents pay $0.50 for machine-readable data.

## What this is

OvernightCo is an AI-powered intelligence product publisher.
Each product is a daily brief researched and written by an AI agent
using the Locus Wrapped APIs (Exa search + Claude writing).

## For AI agents

You can purchase structured JSON data reports for $0.50 USDC each.
See individual skill.md files for per-product payment instructions.

Machine-readable catalog: ${appUrl}/api/catalog

## Payment protocol

All payments use Locus USDC checkout.
Products return HTTP 402 with payment instructions when not authenticated.

Generic flow:
  POST ${appUrl}/api/product/{id}/subscribe {"buyerType":"AGENT"}
  → pay checkoutUrl
  POST ${appUrl}/api/product/{id}/subscribe/confirm {"sessionId":"..."}
  → get accessToken
  GET ${appUrl}/product/{id}/data.json
  Authorization: Bearer <accessToken>

## Available products

${productLines || "No products published yet. Check back soon."}

## About

Published: ${new Date().toISOString()}
Protocol: overnightco-v1
Contact: ${appUrl}
`;

  return new NextResponse(llmsTxt, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "s-maxage=300",
    },
  });
}
