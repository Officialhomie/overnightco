import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
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
  // Locus v1 nests fields under data: { event: "checkout.session.paid", data: { sessionId } }
  const dataObj =
    typeof payload.data === "object" && payload.data !== null
      ? (payload.data as Record<string, unknown>)
      : null;

  const candidates = [
    dataObj?.sessionId,
    dataObj?.session_id,
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
  const dataObj =
    typeof payload.data === "object" && payload.data !== null
      ? (payload.data as Record<string, unknown>)
      : null;

  const candidates = [
    dataObj?.paymentTxHash,
    dataObj?.transactionId,
    dataObj?.transaction_id,
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

function isPaymentConfirmed(payload: Record<string, unknown>): boolean {
  // Locus sends event = "checkout.session.paid" when payment completes
  if (payload.event === "checkout.session.paid") return true;
  // Fallback: legacy status field
  const status =
    (typeof payload.status === "string" && payload.status) ||
    (typeof payload.paymentStatus === "string" && payload.paymentStatus) ||
    "";
  return status.toUpperCase() === "CONFIRMED";
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
 * On payment confirmed for an accessGrant:
 * - Set confirmedAt
 * - Generate HMAC accessToken
 * - Insert REVENUE_HUMAN or REVENUE_AGENT transaction
 *
 * Returns 200 in all non-signature-failure cases.
 *
 * Signature verification uses the per-session whsec_ stored at subscribe time,
 * falling back to LOCUS_WEBHOOK_SECRET env var if not present.
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

  // Extract sessionId first — needed to look up per-session webhook secret
  const sessionId = pickSessionId(payload);
  if (!sessionId) {
    logger.warn("locus.webhook_missing_session_id");
    return new NextResponse("OK", { status: 200 });
  }

  const locusTransactionId = pickTransactionId(payload);

  // Look up the grant early — we need its webhookSecret for signature verification
  const [grant] = await db
    .select()
    .from(accessGrants)
    .where(eq(accessGrants.locusSessionId, sessionId))
    .limit(1);

  // Verify signature using per-session secret, falling back to env var
  const secret =
    grant?.webhookSecret?.trim() ?? process.env.LOCUS_WEBHOOK_SECRET?.trim();
  if (secret) {
    const sigHeader =
      req.headers.get("x-locus-signature") ??
      req.headers.get("x-webhook-signature") ??
      req.headers.get("x-signature-256");

    if (!sigHeader) {
      logger.warn("locus.webhook.rejected_missing_signature", { sessionId });
      return new NextResponse("Signature header required", { status: 401 });
    }
    if (!verifyLocusSignature(raw, sigHeader, secret)) {
      logger.warn("locus.webhook.rejected_invalid_signature", { sessionId });
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else {
    logger.warn("locus.webhook.no_secret_skipping_verification", { sessionId });
  }

  // Only act on confirmed payments
  if (!isPaymentConfirmed(payload)) {
    logger.info("locus.webhook_non_confirmed", {
      sessionId,
      event: payload.event,
    });
    return new NextResponse("OK", { status: 200 });
  }

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
