import "server-only";

import crypto from "node:crypto";
import { eq, and, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { accessGrants, transactions } from "@/lib/db/schema";
import { generateAccessToken } from "@/lib/access/tokens";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function verifyLocusSignature(
  rawBody: Buffer,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const signature = signatureHeader.toLowerCase().startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length).trim()
    : signatureHeader.trim();

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function pickSessionId(payload: Record<string, unknown>): string | undefined {
  const candidates = [
    payload.sessionId,
    payload.session_id,
    payload.checkoutSessionId,
    payload.checkout_session_id,
    payload.id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}

function pickTransactionId(payload: Record<string, unknown>): string | null {
  const candidates = [
    payload.transactionId,
    payload.transaction_id,
    payload.paymentId,
    payload.payment_id,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

function pickStatus(payload: Record<string, unknown>): string {
  return (
    (typeof payload.status === "string" && payload.status) ||
    (typeof payload.paymentStatus === "string" && payload.paymentStatus) ||
    "PENDING"
  );
}

/** GET — Locus webhook verification handshake. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = url.searchParams.get("challenge");
  if (challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("OK", { status: 200 });
}

/**
 * POST — Locus payment event handler.
 *
 * On CONFIRMED for an accessGrant:
 * - Set confirmedAt
 * - Generate HMAC accessToken
 * - Insert REVENUE_HUMAN or REVENUE_AGENT transaction
 *
 * Returns 200 in all non-signature-failure cases.
 */
export async function POST(req: Request) {
  const rawBuffer = await req.arrayBuffer();
  const raw = Buffer.from(rawBuffer);

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
  } catch {
    logger.warn("locus.webhook_non_json");
    return new NextResponse("OK", { status: 200 });
  }

  // Verify signature
  const secret = process.env.LOCUS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      logger.error("locus.webhook.CRITICAL_no_secret_configured");
    }
    logger.warn("locus.webhook.no_secret_skipping_verification");
  } else {
    const sigHeader =
      req.headers.get("x-locus-signature") ??
      req.headers.get("x-webhook-signature") ??
      req.headers.get("x-signature-256");

    if (!sigHeader) {
      logger.warn("locus.webhook.rejected_missing_signature");
      return new NextResponse("Signature header required", { status: 401 });
    }
    if (!verifyLocusSignature(raw, sigHeader, secret)) {
      logger.warn("locus.webhook.rejected_invalid_signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  const sessionId = pickSessionId(payload);
  if (!sessionId) {
    logger.warn("locus.webhook_missing_session_id");
    return new NextResponse("OK", { status: 200 });
  }

  const rawStatus = pickStatus(payload);
  const locusTransactionId = pickTransactionId(payload);

  // Only act on CONFIRMED
  if (rawStatus.toUpperCase() !== "CONFIRMED") {
    logger.info("locus.webhook_non_confirmed", { sessionId, rawStatus });
    return new NextResponse("OK", { status: 200 });
  }

  // Look up the access grant by locus session ID (not yet confirmed)
  const [grant] = await db
    .select()
    .from(accessGrants)
    .where(
      and(
        eq(accessGrants.locusSessionId, sessionId),
        isNotNull(accessGrants.productId),
      ),
    )
    .limit(1);

  if (!grant) {
    logger.info("locus.webhook_unknown_session", { sessionId });
    return new NextResponse("OK", { status: 200 });
  }

  // Idempotency: if already confirmed, skip
  if (grant.confirmedAt) {
    logger.info("locus.webhook_duplicate_skipped", { grantId: grant.id, sessionId });
    return new NextResponse("OK", { status: 200 });
  }

  // Generate access token (24h TTL for humans, 7d for agents)
  const ttlSeconds = grant.buyerType === "HUMAN" ? 86400 : 604800;
  const accessToken = generateAccessToken(
    {
      productId: grant.productId,
      buyerType: grant.buyerType,
      grantId: grant.id,
    },
    ttlSeconds,
  );
  const tokenExpiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const now = new Date();

  // Confirm the grant and store token
  await db
    .update(accessGrants)
    .set({
      confirmedAt: now,
      accessToken,
      tokenExpiresAt,
    })
    .where(eq(accessGrants.id, grant.id));

  // Insert revenue transaction to P&L ledger
  const txType = grant.buyerType === "HUMAN" ? "REVENUE_HUMAN" : "REVENUE_AGENT";
  await db.insert(transactions).values({
    type: txType,
    amountUsdc: grant.amountUsdc,
    productId: grant.productId,
    locusSessionId: sessionId,
    locusTransactionId: locusTransactionId ?? undefined,
    buyerType: grant.buyerType,
    description: `${grant.buyerType} purchase confirmed`,
    metadata: JSON.stringify({ sessionId, locusTransactionId }),
    occurredAt: now,
  });

  logger.info("locus.webhook_confirmed", {
    grantId: grant.id,
    productId: grant.productId,
    buyerType: grant.buyerType,
    amountUsdc: grant.amountUsdc,
  });

  return new NextResponse("OK", { status: 200 });
}
