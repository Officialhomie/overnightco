import "server-only";

import { callExa, type ExaSearchResult } from "@/lib/locus/wrapped-apis";
import { logger } from "@/lib/logger";

export interface ResearchResult {
  topStories: ExaSearchResult[];
  dataPoints: ExaSearchResult[];
  totalCostUsdc: string;
}

/**
 * Research a niche topic using two Exa searches via Locus Wrapped APIs.
 * Both calls are linked to the productId for P&L tracking.
 */
export async function researchTopic(
  topic: string,
  opts: { productId: string; cycleId: string },
): Promise<ResearchResult> {
  logger.info("researcher.start", { topic, ...opts });

  const [storiesResult, dataResult] = await Promise.all([
    callExa(`${topic} latest news analysis`, {
      productId: opts.productId,
      cycleId: opts.cycleId,
      numResults: 5,
    }),
    callExa(`${topic} statistics data trends 2025`, {
      productId: opts.productId,
      cycleId: opts.cycleId,
      numResults: 5,
    }),
  ]);

  const totalCost = (
    parseFloat(storiesResult.costUsdc) +
    parseFloat(dataResult.costUsdc)
  ).toFixed(6);

  logger.info("researcher.complete", { topic, totalCostUsdc: totalCost });

  return {
    topStories: storiesResult.data,
    dataPoints: dataResult.data,
    totalCostUsdc: totalCost,
  };
}
