import "server-only";

import { getAddress } from "viem";
import { LocusClient } from "./client";
import { logger } from "@/lib/logger";

export interface SendResult {
  transactionId: string;
  status: string;
}

/**
 * Send USDC to a wallet address via Locus pay/send.
 * Used for the morning profit sweep (Phase 4 — Report).
 *
 * Locus API: POST /pay/send
 * Body: { to_address, amount (number), memo }
 */
export async function sendUsdcToWallet(
  toAddress: string,
  amountUsdc: number,
  memo: string,
): Promise<SendResult> {
  if (process.env.MOCK_LOCUS === "1") {
    logger.info("locus.pay_send.mock", { toAddress, amountUsdc, memo });
    return { transactionId: `mock_tx_${Date.now()}`, status: "CONFIRMED" };
  }

  // EIP-55 checksum required — Locus /pay/send rejects lowercase addresses
  const checksummedAddress = getAddress(toAddress);

  const client = new LocusClient();
  const res = await client.request<Record<string, unknown>>("/pay/send", {
    method: "POST",
    body: JSON.stringify({
      to_address: checksummedAddress,
      amount: amountUsdc,
      memo,
    }),
  });

  if (!res.success) {
    logger.error("locus.pay_send.failed", {
      toAddress,
      amountUsdc,
      error: res.error,
    });
    throw new Error(`Locus pay/send failed: ${res.error}`);
  }

  const data = res.data as Record<string, unknown>;
  const transactionId =
    (typeof data.transaction_id === "string" && data.transaction_id) ||
    (typeof data.transactionId === "string" && data.transactionId) ||
    (typeof data.id === "string" && data.id) ||
    "";

  const status = (typeof data.status === "string" && data.status) || "PENDING";

  logger.info("locus.pay_send.success", { toAddress, amountUsdc, transactionId });

  return { transactionId, status };
}
