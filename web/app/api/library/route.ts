import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, inArray, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { accessGrants, products } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const ids = url.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];

  // Email lookup — return all active grants for a buyer
  if (email) {
    const now = new Date();
    const grants = await db
      .select({
        productId: accessGrants.productId,
        accessToken: accessGrants.accessToken,
        tokenExpiresAt: accessGrants.tokenExpiresAt,
        title: products.title,
        publishedAt: products.publishedAt,
      })
      .from(accessGrants)
      .innerJoin(products, eq(accessGrants.productId, products.id))
      .where(
        and(
          eq(accessGrants.buyerEmail, email),
          isNotNull(accessGrants.confirmedAt),
          isNotNull(accessGrants.accessToken),
          gt(accessGrants.tokenExpiresAt, now),
        ),
      );

    return NextResponse.json({
      success: true,
      data: grants.map((g) => ({
        productId: g.productId,
        title: g.title,
        publishedAt: g.publishedAt,
        accessToken: g.accessToken,
      })),
    });
  }

  // ID lookup — return metadata for specific product IDs
  if (ids.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const found = await db
    .select({
      id: products.id,
      title: products.title,
      niche: products.niche,
      publishedAt: products.publishedAt,
      previewHtml: products.teaser,
    })
    .from(products)
    .where(inArray(products.id, ids));

  return NextResponse.json({ success: true, data: found });
}
