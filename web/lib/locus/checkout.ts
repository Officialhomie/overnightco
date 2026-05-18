import "server-only";

import { LocusClient } from "./client";

function getClient() {
  return new LocusClient();
}

function assertSuccess<T>(
  res: { success: true; data: T } | { success: false },
  ctx: string,
): asserts res is { success: true; data: T } {
  if (!res.success) {
    throw new Error(`${ctx}: ${(res as { message?: string }).message ?? "Locus API error"}`);
  }
}

function pickSessionId(data: Record<string, unknown>): string {
  const id =
    (typeof data.id === "string" && data.id) ||
    (typeof data.sessionId === "string" && data.sessionId) ||
    (typeof data.session_id === "string" && data.session_id);
  if (!id) throw new Error("Locus create session: missing session id in response");
  return id;
}

function pickCheckoutUrl(data: Record<string, unknown>): string | undefined {
  return (
    (typeof data.checkoutUrl === "string" && data.checkoutUrl) ||
    (typeof data.checkout_url === "string" && data.checkout_url) ||
    (typeof data.url === "string" && data.url) ||
    undefined
  );
}

function pickWebhookSecret(data: Record<string, unknown>): string | undefined {
  return (
    (typeof data.webhookSecret === "string" && data.webhookSecret) ||
    (typeof data.webhook_secret === "string" && data.webhook_secret) ||
    (typeof data.whsec === "string" && data.whsec) ||
    undefined
  );
}

export async function createCheckoutSession(params: {
  amountUsdc: string;
  productName: string;
  successUrl?: string;
}): Promise<{ sessionId: string; checkoutUrl: string; webhookSecret?: string }> {
  if (process.env.MOCK_LOCUS === "1") {
    const id = `mock_sess_${Date.now()}`;
    return {
      sessionId: id,
      checkoutUrl: `https://example.com/mock-locus-checkout/${id}`,
    };
  }

  const client = getClient();
  const rawAuthUrl = process.env.AUTH_URL ?? "";
  // Only include webhookUrl for public (non-localhost) deployments
  const isPublicUrl = rawAuthUrl.startsWith("https://") && !rawAuthUrl.includes("localhost");

  const body: Record<string, unknown> = {
    amount: params.amountUsdc,
    currency: "USDC",
    description: params.productName,
    ...(isPublicUrl ? { webhookUrl: `${rawAuthUrl}/api/webhooks/locus` } : {}),
    ...(params.successUrl ? { success_url: params.successUrl } : {}),
  };

  const res = await client.request<Record<string, unknown>>("/checkout/sessions", {
    method: "POST",
    body: JSON.stringify(body),
  });
  assertSuccess(res, "createCheckoutSession");
  const data = res.data;
  const sessionId = pickSessionId(data);
  let checkoutUrl = pickCheckoutUrl(data);
  const webhookSecret = pickWebhookSecret(data);

  if (!checkoutUrl) {
    const detail = await client.request<Record<string, unknown>>(
      `/checkout/sessions/${sessionId}`,
      { method: "GET" },
    );
    assertSuccess(detail, "getCheckoutSession");
    checkoutUrl = pickCheckoutUrl(detail.data as Record<string, unknown>);
  }

  if (!checkoutUrl) {
    throw new Error("Locus create session: missing checkout URL");
  }

  return { sessionId, checkoutUrl, webhookSecret };
}

export async function getSessionDetail(sessionId: string): Promise<{
  sessionId: string;
  status: string;
  amount: string | undefined;
}> {
  const client = getClient();
  const res = await client.request<Record<string, unknown>>(
    `/checkout/sessions/${sessionId}`,
    { method: "GET" },
  );
  assertSuccess(res, "getSessionDetail");
  const data = res.data as Record<string, unknown>;

  const status =
    (typeof data.status === "string" && data.status) ||
    (typeof data.paymentStatus === "string" && data.paymentStatus) ||
    "UNKNOWN";

  const amount =
    (typeof data.amount === "string" && data.amount) ||
    (typeof data.amountUsdc === "string" && data.amountUsdc) ||
    undefined;

  return { sessionId, status, amount };
}
