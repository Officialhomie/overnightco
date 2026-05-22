import "server-only";

import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://overnightco.vercel.app";

  const [product] = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(1);

  if (!product) {
    return NextResponse.json(
      { status: "pending", message: "Next issue generating now" },
      { headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      id: product.id,
      title: product.title,
      summary: product.teaser,
      niche: product.niche,
      humanPrice: parseFloat(product.humanPriceUsdc),
      agentPrice: parseFloat(product.agentPriceUsdc),
      humanCheckoutUrl: `${appUrl}/product/${product.id}`,
      agentEndpoint: `${appUrl}/api/product/${product.id}/content`,
      generatedAt: (product.publishedAt ?? product.createdAt).toISOString(),
      costBasis: parseFloat(product.totalCostUsdc),
      status: product.status.toLowerCase(),
    },
    { headers: CORS_HEADERS },
  );
}
