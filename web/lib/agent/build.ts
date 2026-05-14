import "server-only";

import { db } from "@/lib/db";
import { products, aiDecisions, transactions } from "@/lib/db/schema";
import { runContentPipeline } from "@/lib/content/pipeline";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";
import type { NicheDecision } from "./decide";

export interface BuildResult {
  productId: string;
  productUrl: string;
  title: string;
  totalCostUsdc: string;
}

/**
 * Run the BUILD phase:
 * 1. Create product row (BUILDING status)
 * 2. Run content pipeline (research + write via Locus Wrapped APIs)
 * 3. Update product with content, set status to LIVE
 * 4. Log AI decision for dashboard transparency
 */
export async function runBuildPhase(
  decision: NicheDecision,
  cycleId: string,
  appUrl: string,
): Promise<BuildResult> {
  logger.info("agent.build.start", { niche: decision.selectedNiche, cycleId });

  // Generate a URL-safe slug from the niche name
  const slug = `${Date.now()}-${decision.selectedNiche
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)}`;

  // Create placeholder product row
  const [product] = await db
    .insert(products)
    .values({
      cycleId,
      title: decision.selectedNiche,
      slug,
      niche: decision.selectedNiche,
      teaser: decision.selectedDescription,
      status: "BUILDING",
    })
    .returning({ id: products.id });

  const productId = product.id;

  try {
    // Run content pipeline (Exa + Claude via Locus Wrapped APIs)
    const pipeline = await runContentPipeline(decision.selectedNiche, {
      productId,
      cycleId,
    });

    // Update product with content
    await db
      .update(products)
      .set({
        title: pipeline.title,
        teaser: pipeline.teaser,
        humanHtml: pipeline.humanHtml,
        agentJson: pipeline.agentJson,
        researchSources: JSON.stringify(pipeline.researchSources),
        totalCostUsdc: pipeline.totalCostUsdc,
        status: "LIVE",
        publishedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // NOTE: individual COST_EXA and COST_CLAUDE rows are already inserted by
    // wrapped-apis.ts on each call. Do NOT insert a COST_BUILD aggregate here —
    // it would double-count all build costs in the P&L calculator.

    // Log BUILD decision to AI decisions table
    await db.insert(aiDecisions).values({
      cycleId,
      productId,
      phase: "BUILD",
      prompt: `Build content product for niche: "${decision.selectedNiche}"`,
      reasoning: JSON.stringify({
        title: pipeline.title,
        researchSourceCount: pipeline.researchSources.length,
        researchCostUsdc: pipeline.costBreakdown.researchCostUsdc,
        writingCostUsdc: pipeline.costBreakdown.writingCostUsdc,
        totalCostUsdc: pipeline.totalCostUsdc,
      }),
      decision: `Published "${pipeline.title}" at /product/${productId}`,
      costUsdc: pipeline.totalCostUsdc,
    });

    const productUrl = `${appUrl}/product/${productId}`;

    logger.info("agent.build.complete", {
      productId,
      title: pipeline.title,
      totalCostUsdc: pipeline.totalCostUsdc,
      slug,
    });

    return {
      productId,
      productUrl,
      title: pipeline.title,
      totalCostUsdc: pipeline.totalCostUsdc,
    };
  } catch (err) {
    // Mark product as failed so dashboard shows the error state
    await db
      .update(products)
      .set({ status: "FAILED" })
      .where(eq(products.id, productId));

    logger.error("agent.build.failed", {
      productId,
      error: String(err),
    });

    throw err;
  }
}
