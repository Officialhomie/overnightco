import "server-only";

import { eq, and, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { accessGrants } from "@/lib/db/schema";
import { verifyAccessToken } from "@/lib/access/tokens";
import { logger } from "@/lib/logger";

/**
 * HTTP 402 Payment Required — Agent-tier content gate.
 *
 * Called by GET /product/[id]/data.json for the $0.50 agent tier.
 *
 * Flow:
 * 1. Check for Authorization: Bearer <accessToken> header
 * 2. Verify HMAC token — must be AGENT type and match productId
 * 3. If valid → return null (caller serves content)
 * 4. If missing/invalid → return 402 with payment instructions
 *
 * Agents must:
 *   POST /api/product/{id}/subscribe {"buyerType":"AGENT"}
 *   → receive {sessionId, checkoutUrl}
 *   → pay via Locus Checkout
 *   → POST /api/product/{id}/subscribe/confirm {"sessionId":"..."}
 *   → receive {accessToken}
 *   → GET /product/{id}/data.json with Authorization: Bearer <accessToken>
 */
export async function checkHttp402Gate(
  req: Request,
  productId: string,
  appUrl: string,
): Promise<NextResponse | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (token) {
    const payload = verifyAccessToken(token);
    if (payload && payload.productId === productId && payload.buyerType === "AGENT") {
      // Valid token — check grant still exists in DB
      const [grant] = await db
        .select({ id: accessGrants.id })
        .from(accessGrants)
        .where(
          and(
            eq(accessGrants.productId, productId),
            eq(accessGrants.accessToken, token),
            isNotNull(accessGrants.confirmedAt),
          ),
        )
        .limit(1);

      if (grant) {
        logger.info("http402.access_granted", { productId, grantId: grant.id });
        return null; // Caller serves content
      }
    }
    logger.warn("http402.invalid_token", { productId });
  }

  // Return 402 with machine-readable payment instructions
  const instructions = {
    error: "Payment Required",
    price: "0.50",
    currency: "USDC",
    buyerType: "AGENT",
    instructions: {
      step1: `POST ${appUrl}/api/product/${productId}/subscribe`,
      step1Body: { buyerType: "AGENT" },
      step2: "Pay the returned Locus checkout session",
      step3: `POST ${appUrl}/api/product/${productId}/subscribe/confirm`,
      step3Body: { sessionId: "<sessionId from step 1>" },
      step4: `GET ${appUrl}/product/${productId}/data.json`,
      step4Headers: { Authorization: "Bearer <accessToken from step 3>" },
    },
    discovery: `${appUrl}/llms.txt`,
    catalog: `${appUrl}/api/catalog`,
  };

  return NextResponse.json(instructions, {
    status: 402,
    headers: {
      "X-Payment-Required": "true",
      "X-Price-USDC": "0.50",
      "X-Payment-Protocol": "locus-checkout-v1",
    },
  });
}
