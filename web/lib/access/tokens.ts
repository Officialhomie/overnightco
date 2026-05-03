import crypto from "node:crypto";

export interface AccessTokenPayload {
  productId: string;
  buyerType: "HUMAN" | "AGENT";
  grantId: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret) throw new Error("ACCESS_TOKEN_SECRET is not set");
  return secret;
}

/**
 * Generate an HMAC-signed access token.
 * Format: base64(payload).base64(signature)
 */
export function generateAccessToken(
  payload: Omit<AccessTokenPayload, "exp">,
  ttlSeconds = 60 * 60 * 24, // 24 hours default
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const data: AccessTokenPayload = { ...payload, exp };
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${sig}`;
}

/**
 * Verify and decode an access token.
 * Returns null if invalid, expired, or malformed.
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const encoded = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const expectedSig = crypto
      .createHmac("sha256", getSecret())
      .update(encoded)
      .digest("base64url");

    const a = Buffer.from(sig, "base64url");
    const b = Buffer.from(expectedSig, "base64url");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as AccessTokenPayload;

    if (Math.floor(Date.now() / 1000) > payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
