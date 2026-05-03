import "server-only";

import { LocusClient } from "./client";
import { logger } from "@/lib/logger";

export interface WalletBalance {
  usdcBalance: string;
  promoBalance: string;
  allowance: string;
  total: string;
}

export async function getBalance(): Promise<WalletBalance> {
  if (process.env.MOCK_LOCUS === "1") {
    return {
      usdcBalance: "20.00",
      promoBalance: "10.00",
      allowance: "10",
      total: "30.00",
    };
  }

  const client = new LocusClient();
  const res = await client.request<Record<string, unknown>>("/pay/balance");

  if (!res.success) {
    logger.error("locus.balance_failed", { error: res.error });
    return { usdcBalance: "0.00", promoBalance: "0.00", allowance: "0", total: "0.00" };
  }

  const data = res.data as Record<string, unknown>;

  const usdcBalance = String(data.usdc_balance ?? data.usdcBalance ?? "0.00");
  const promoBalance = String(data.promo_credit_balance ?? data.promoCreditBalance ?? "0.00");
  const allowance = String(data.allowance ?? "0");

  const total = (parseFloat(usdcBalance) + parseFloat(promoBalance)).toFixed(2);

  return { usdcBalance, promoBalance, allowance, total };
}
