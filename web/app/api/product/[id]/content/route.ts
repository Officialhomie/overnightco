import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { verifyAccessToken } from "@/lib/access/tokens";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { error: "Authorization required", code: "NO_TOKEN" },
      { status: 401 },
    );
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: "Invalid or expired token", code: "INVALID_TOKEN" },
      { status: 401 },
    );
  }

  if (payload.productId !== id) {
    return NextResponse.json(
      { error: "Token does not match this product", code: "WRONG_PRODUCT" },
      { status: 403 },
    );
  }

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      niche: products.niche,
      humanHtml: products.humanHtml,
      publishedAt: products.publishedAt,
    })
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) {
    return NextResponse.json(
      { error: "Product not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  const DEMO_HTML = `
<h2>AI wrappers are quietly dying. Vertical workflow tools just had their best week of the year.</h2>
<p>Six bootstrapped founders crossed $10K MRR this week — five of them sell to accountants, plumbers, or veterinarians. Inside: the niches eating the long tail, and why 'ChatGPT for X' listings dropped 38%.</p>
<h2>The numbers</h2>
<p>The "AI-powered" label is actively hurting conversion now. Launch data from 31 Indie Hackers launches this week shows a 38% drop in click-through for products leading with AI positioning versus specific utility claims.</p>
<h2>Who crossed $10K</h2>
<p>Receiptable crossed $10K MRR on Tuesday. VetScript hit it Thursday. PlumberDesk Wednesday. All three sell to trades and professional services. None use "AI" in their headline.</p>
<h2>The vertical opportunity</h2>
<p>Directory sites in niche verticals quietly doing $6K+/mo. Pick a profession with no dominant SaaS, build a simple tool, charge $29-49/month.</p>
<h2>What is dying</h2>
<p>Chrome extensions for consumers: flat. B2B compliance extensions: up significantly. Newsletter SaaS: saturated at the top, three adjacent niches open.</p>
`;

  const content = product.humanHtml ?? DEMO_HTML;

  return NextResponse.json({
    success: true,
    data: {
      id: product.id,
      title: product.title,
      niche: product.niche,
      contentHtml: content,
      publishedAt: product.publishedAt,
      buyerType: payload.buyerType,
    },
  });
}
