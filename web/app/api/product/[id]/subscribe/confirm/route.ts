import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accessGrants, transactions } from "@/lib/db/schema";
import { getSessionDetail } from "@/lib/locus/checkout";
import { generateAccessToken } from "@/lib/access/tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ConfirmSchema = z.object({
  sessionId: z.string().min(1),
});

/**
 * POST /api/product/[id]/subscribe/confirm
 *
 * Polls Locus to verify payment, then issues an HMAC access token.
 * Called by buyers after completing Locus checkout.
 *
 * This is the polling path — webhooks are the fast path.
 * If webhook already confirmed the grant, we return the existing token.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { sessionId } = parsed.data;

  // Look up the pending grant
  const [grant] = await db
    .select()
    .from(accessGrants)
    .where(
      and(
        eq(accessGrants.productId, productId),
        eq(accessGrants.locusSessionId, sessionId),
      ),
    )
    .limit(1);

  if (!grant) {
    return NextResponse.json(
      { error: "Session not found. Did you subscribe first?" },
      { status: 404 },
    );
  }

  // If webhook already confirmed this grant, return existing token
  if (grant.confirmedAt && grant.accessToken) {
    logger.info("product.confirm.already_confirmed", {
      grantId: grant.id,
      sessionId,
    });
    return NextResponse.json({
      success: true,
      data: { accessToken: grant.accessToken, expiresAt: grant.tokenExpiresAt?.toISOString() },
    });
  }

  // Poll Locus to check payment status
  let sessionDetail: Awaited<ReturnType<typeof getSessionDetail>>;
  try {
    sessionDetail = await getSessionDetail(sessionId);
  } catch (err) {
    logger.error("product.confirm.locus_poll_failed", {
      sessionId,
      error: String(err),
    });
    return NextResponse.json(
      { error: "Failed to verify payment with Locus" },
      { status: 502 },
    );
  }

  const status = sessionDetail.status.toUpperCase();
  if (status !== "CONFIRMED" && status !== "PAID" && status !== "COMPLETED") {
    return NextResponse.json(
      {
        success: false,
        status: sessionDetail.status,
        hint: "Payment not yet confirmed. Wait a moment and try again.",
      },
      { status: 202 },
    );
  }

  // Generate access token
  const ttlSeconds = grant.buyerType === "HUMAN" ? 86400 : 604800;
  const accessToken = generateAccessToken(
    {
      productId,
      buyerType: grant.buyerType,
      grantId: grant.id,
    },
    ttlSeconds,
  );
  const tokenExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const now = new Date();

  // Update grant as confirmed
  await db
    .update(accessGrants)
    .set({ confirmedAt: now, accessToken, tokenExpiresAt })
    .where(eq(accessGrants.id, grant.id));

  // Insert revenue transaction if not already added by webhook
  const existing = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.locusSessionId, sessionId))
    .limit(1);

  if (existing.length === 0) {
    const txType =
      grant.buyerType === "HUMAN" ? "REVENUE_HUMAN" : "REVENUE_AGENT";
    await db.insert(transactions).values({
      type: txType,
      amountUsdc: grant.amountUsdc,
      productId,
      locusSessionId: sessionId,
      buyerType: grant.buyerType,
      description: `${grant.buyerType} purchase confirmed (polling)`,
      occurredAt: now,
    });
  }

  logger.info("product.confirm.success", {
    grantId: grant.id,
    productId,
    buyerType: grant.buyerType,
    amountUsdc: grant.amountUsdc,
  });

  return NextResponse.json({
    success: true,
    data: { accessToken, expiresAt: tokenExpiresAt.toISOString() },
  });
}
