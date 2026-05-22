import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { accessGrants, products } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const SendLinkSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  productId: z.string().uuid(),
});

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = SendLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { email, token, productId } = parsed.data;

  // Look up the grant by access token
  const [grant] = await db
    .select({ id: accessGrants.id })
    .from(accessGrants)
    .where(eq(accessGrants.accessToken, token))
    .limit(1);

  if (!grant) {
    return NextResponse.json(
      { error: "Access token not found", code: "INVALID_TOKEN" },
      { status: 404 },
    );
  }

  // Look up product title
  const [product] = await db
    .select({ title: products.title })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product) {
    return NextResponse.json(
      { error: "Product not found", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  // Store email on the grant
  await db
    .update(accessGrants)
    .set({ buyerEmail: email })
    .where(eq(accessGrants.id, grant.id));

  const reportUrl = `https://svc-mp9pjv3pc4qow92z.buildwithlocus.com/report?token=${token}&id=${productId}`;

  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    // Primary: send via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "OvernightCo <overnightco@agentmail.to>",
        to: [email],
        subject: "Your OvernightCo report is ready",
        html: `
          <p>Your report is ready to read.</p>
          <h2>${product.title}</h2>
          <p><a href="${reportUrl}">Read your report →</a></p>
          <p style="color:#999;font-size:12px">
            This link is personal to you and expires in 24 hours.
          </p>
        `,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      logger.error("access.send-link.resend_error", { status: emailRes.status, err });
      return NextResponse.json(
        { error: "Failed to send email", code: "EMAIL_FAILED" },
        { status: 502 },
      );
    }
  } else {
    // Fallback: send via Locus pay/send with to_email
    const locusKey = process.env.LOCUS_API_KEY;
    const locusBase = process.env.LOCUS_API_BASE ?? "https://beta-api.paywithlocus.com/api";
    if (!locusKey) {
      logger.error("access.send-link.no_email_service", {});
      return NextResponse.json(
        { error: "Email service not configured", code: "NO_EMAIL_SERVICE" },
        { status: 503 },
      );
    }

    const locusRes = await fetch(`${locusBase}/pay/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${locusKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to_email: email,
        subject: `Your OvernightCo report: ${product.title}`,
        message: reportUrl,
      }),
    });

    if (!locusRes.ok) {
      const err = await locusRes.text();
      logger.error("access.send-link.locus_error", { status: locusRes.status, err });
      return NextResponse.json(
        { error: "Failed to send email", code: "EMAIL_FAILED" },
        { status: 502 },
      );
    }
  }

  logger.info("access.send-link.sent", { email, productId, grantId: grant.id });

  return NextResponse.json({ success: true });
}
