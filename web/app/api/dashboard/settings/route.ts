import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { newsletterSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const SettingsSchema = z.object({
  defaultCategory: z.string().min(1).max(200),
  humanPriceUsdc: z.string().regex(/^\d+(\.\d{1,2})?$/),
  agentPriceUsdc: z.string().regex(/^\d+(\.\d{1,2})?$/),
  payoutWalletAddress: z.string().optional(),
  payoutThresholdUsdc: z.string().regex(/^\d+(\.\d{1,2})?$/),
  isPayoutEnabled: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const values = parsed.data;

  // Upsert settings (there is only ever one row)
  const existing = await db.select({ id: newsletterSettings.id }).from(newsletterSettings).limit(1);

  if (existing.length > 0) {
    await db
      .update(newsletterSettings)
      .set({
        defaultCategory: values.defaultCategory,
        humanPriceUsdc: values.humanPriceUsdc,
        agentPriceUsdc: values.agentPriceUsdc,
        payoutWalletAddress: values.payoutWalletAddress ?? null,
        payoutThresholdUsdc: values.payoutThresholdUsdc,
        isPayoutEnabled: values.isPayoutEnabled,
        updatedAt: new Date(),
      });
  } else {
    await db.insert(newsletterSettings).values({
      defaultCategory: values.defaultCategory,
      humanPriceUsdc: values.humanPriceUsdc,
      agentPriceUsdc: values.agentPriceUsdc,
      payoutWalletAddress: values.payoutWalletAddress ?? null,
      payoutThresholdUsdc: values.payoutThresholdUsdc,
      isPayoutEnabled: values.isPayoutEnabled,
    });
  }

  return NextResponse.json({ success: true });
}
