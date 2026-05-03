import "server-only";

import { NextResponse } from "next/server";
import { checkHttp402Gate } from "@/lib/locus/http402";

export const dynamic = "force-dynamic";

/**
 * POST /api/product/[id]/access
 *
 * HTTP 402 gate check for agent-tier access.
 * Agents call this before hitting /product/[id]/data.json.
 *
 * Returns:
 *   200 { access: true }  — valid token, caller may proceed
 *   402 { error, instructions } — payment required
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const gate = await checkHttp402Gate(req, productId, appUrl);
  if (gate) return gate;

  return NextResponse.json({ access: true });
}
