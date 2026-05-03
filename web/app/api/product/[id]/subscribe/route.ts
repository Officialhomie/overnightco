import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { products, accessGrants } from "@/lib/db/schema";
import { createCheckoutSession } from "@/lib/locus/checkout";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SubscribeSchema = z.object({
  buyerType: z.enum(["HUMAN", "AGENT"]).default("HUMAN"),
});

/**
 * POST /api/product/[id]/subscribe
 *
 * Creates a Locus checkout session for this product.
 * Returns { sessionId, checkoutUrl } so the buyer can pay.
 *
 * Human tier: $2.00 USDC
 * Agent tier: $0.50 USDC (agents use this before hitting /data.json)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      status: products.status,
      humanPriceUsdc: products.humanPriceUsdc,
      agentPriceUsdc: products.agentPriceUsdc,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status !== "LIVE") {
    return NextResponse.json(
      { error: "Product not available yet" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = SubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { buyerType } = parsed.data;
  const amountUsdc =
    buyerType === "AGENT" ? product.agentPriceUsdc : product.humanPriceUsdc;

  const label =
    buyerType === "AGENT"
      ? `Agent data report — ${product.title}`
      : `${product.title} — OvernightCo`;

  try {
    const { sessionId, checkoutUrl } = await createCheckoutSession({
      amountUsdc,
      productName: label,
    });

    // Create pending access grant
    await db.insert(accessGrants).values({
      productId,
      locusSessionId: sessionId,
      buyerType,
      amountUsdc,
    });

    logger.info("product.subscribe.created", {
      productId,
      sessionId,
      buyerType,
      amountUsdc,
    });

    return NextResponse.json({ sessionId, checkoutUrl, buyerType, amountUsdc });
  } catch (err) {
    logger.error("product.subscribe.failed", { productId, error: String(err) });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 502 },
    );
  }
}
