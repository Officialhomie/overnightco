import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accessGrants, transactions } from "@/lib/db/schema";
import { LocusClient } from "@/lib/locus/client";
import { generateAccessToken } from "@/lib/access/tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ConfirmSchema = z.object({
  sessionId: z.string().min(1),
});

type LocusSessionStatus = "CONFIRMED" | "PENDING" | "EXPIRED" | "UNKNOWN";

async function checkLocusSessionStatus(
  sessionId: string,
): Promise<LocusSessionStatus> {
  try {
    const client = new LocusClient({ apiKey: process.env.LOCUS_API_KEY! });
    const res = await client.request<Record<string, unknown>>(
      `/checkout/sessions/${sessionId}`,
      { method: "GET" },
    );
    const data =
      (res as { success: boolean; data?: Record<string, unknown> }).data ?? {};
    const raw =
      (typeof data.status === "string" && data.status) ||
      (typeof data.paymentStatus === "string" && data.paymentStatus) ||
      "";
    const s = raw.toUpperCase();
    if (s === "CONFIRMED" || s === "PAID" || s === "COMPLETED" || s === "SUCCEEDED") {
      return "CONFIRMED";
    }
    if (s === "EXPIRED" || s === "CANCELLED" || s === "CANCELED") {
      return "EXPIRED";
    }
    return "PENDING";
  } catch {
    return "UNKNOWN";
  }
}

/**
 * POST /api/product/[id]/subscribe/confirm
 *
 * Verifies payment and issues an HMAC access token.
 * Does NOT rely on the webhook — polls Locus directly every time.
 *
 * Fast path: webhook already confirmed → return cached token.
 * Slow path: poll Locus, generate token on the spot.
 *
 * Never returns 402. Status codes:
 *   200 — confirmed, token in response
 *   202 — payment pending, try again
 *   404 — session unknown
 *   410 — session expired
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

  // Look up the grant
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

  // Fast path: webhook already confirmed this grant
  if (grant.confirmedAt && grant.accessToken) {
    const now = new Date();
    const isExpired = grant.tokenExpiresAt && grant.tokenExpiresAt < now;

    if (!isExpired) {
      logger.info("product.confirm.already_confirmed", { grantId: grant.id, sessionId });
      return NextResponse.json({
        success: true,
        data: { accessToken: grant.accessToken, expiresAt: grant.tokenExpiresAt?.toISOString(), buyerEmail: grant.buyerEmail },
      });
    }

    // Token expired — re-generate without re-checking Locus (payment already confirmed)
    logger.info("product.confirm.token_refresh", { grantId: grant.id, sessionId });
    const ttlSeconds = grant.buyerType === "HUMAN" ? 86400 : 604800;
    const newToken = generateAccessToken(
      { productId, buyerType: grant.buyerType, grantId: grant.id },
      ttlSeconds,
    );
    const newExpiry = new Date(Date.now() + ttlSeconds * 1000);

    await db
      .update(accessGrants)
      .set({ accessToken: newToken, tokenExpiresAt: newExpiry })
      .where(eq(accessGrants.id, grant.id));

    return NextResponse.json({
      success: true,
      data: { accessToken: newToken, expiresAt: newExpiry.toISOString(), buyerEmail: grant.buyerEmail },
    });
  }

  // Slow path: poll Locus directly
  const locusStatus = await checkLocusSessionStatus(sessionId);

  if (locusStatus === "EXPIRED") {
    logger.info("product.confirm.expired", { sessionId });
    return NextResponse.json(
      { error: "Checkout session has expired. Please subscribe again." },
      { status: 410 },
    );
  }

  if (locusStatus === "PENDING" || locusStatus === "UNKNOWN") {
    return NextResponse.json(
      {
        success: false,
        status: locusStatus,
        hint: "Payment not yet confirmed. Wait a moment and try again.",
      },
      { status: 202 },
    );
  }

  // CONFIRMED — generate token and persist
  const ttlSeconds = grant.buyerType === "HUMAN" ? 86400 : 604800;
  const accessToken = generateAccessToken(
    { productId, buyerType: grant.buyerType, grantId: grant.id },
    ttlSeconds,
  );
  const tokenExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const now = new Date();

  await db
    .update(accessGrants)
    .set({ confirmedAt: now, accessToken, tokenExpiresAt })
    .where(eq(accessGrants.id, grant.id));

  // Insert revenue transaction if not already added by webhook
  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.locusSessionId, sessionId))
    .limit(1);

  if (!existing) {
    const txType = grant.buyerType === "HUMAN" ? "REVENUE_HUMAN" : "REVENUE_AGENT";
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
    data: { accessToken, expiresAt: tokenExpiresAt.toISOString(), buyerEmail: grant.buyerEmail },
  });
}
