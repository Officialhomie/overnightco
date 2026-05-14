import "server-only";

import { callExa, type ExaSearchResult } from "@/lib/locus/wrapped-apis";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { logger } from "@/lib/logger";

export interface ResearchResult {
  topStories: ExaSearchResult[];
  dataPoints: ExaSearchResult[];
  totalCostUsdc: string;
}

const DEMO_COST_EXA = "0.007000";

/**
 * Research a niche topic using two Exa searches via Locus Wrapped APIs.
 * Both calls are linked to the productId for P&L tracking.
 */
export async function researchTopic(
  topic: string,
  opts: { productId: string; cycleId: string },
): Promise<ResearchResult> {
  // DEMO_MODE: skip Exa, return cached fixture instantly
  if (process.env.DEMO_MODE === "true") {
    await db.insert(transactions).values([
      {
        type: "COST_EXA",
        amountUsdc: DEMO_COST_EXA,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: `Exa search: "${topic.slice(0, 40)} latest news" (demo)`,
      },
      {
        type: "COST_EXA",
        amountUsdc: DEMO_COST_EXA,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: `Exa search: "${topic.slice(0, 40)} statistics data" (demo)`,
      },
    ]);
    return {
      topStories: [
        {
          title: "2025 Thrift Flipping Guide: $4k/month from $200 starting budget",
          url: "https://smallbiztrends.com/thrift-store-flipping/",
          text: "Resellers are finding Q2 2025 is peak season for branded sportswear. Nike, Adidas, and New Balance from thrift stores consistently flip 8-15x. Best markets: eBay, Depop, Poshmark.",
          publishedDate: "2025-02-13T11:20:17.000Z",
        },
        {
          title: "Here's How I Make $1,000 a Month Selling Thrift Store Finds Online",
          url: "https://www.moneytalksnews.com/amtn-how-to-resell-secondhand-items/",
          text: "Community members reporting record volumes. Levi's 501s still the #1 flip item. Starting budget $50-200 is common. Most profitable niches: vintage tees, Y2K fashion, outdoor gear.",
          publishedDate: "2025-12-19T12:23:34.000Z",
        },
        {
          title: "Side hustle spotlight: thrift reselling income breakdown",
          url: "https://www.underpriced.app/blog/ultimate-thrift-store-flipping-guide",
          text: "Part-time flippers averaging $800-$2,400/month. Full-time reaching $5k-$8k. Key skill: spotting undervalued items. Sourcing strategy matters more than selling platform.",
          publishedDate: "2025-08-27T06:08:57.000Z",
        },
      ],
      dataPoints: [
        {
          title: "Secondhand market size 2024-2027 forecast",
          url: "https://example.com/market-data",
          text: "Secondhand market crossed $43B in 2024, projected $70B by 2027. Thrift-sourced reselling captures ~12% ($5.2B annually). Branded sportswear averages 8-15x flip ratio.",
          publishedDate: "2025-01-01T00:00:00.000Z",
        },
        {
          title: "Platform fee comparison: Depop vs Poshmark vs eBay 2025",
          url: "https://example.com/platform-fees",
          text: "Depop 10%, Poshmark 20% over $15, eBay 13.25%. eBay highest volume: 185M buyers. Facebook Marketplace optimal for bulky local pickup. Sourcing 3x weekly optimal.",
          publishedDate: "2025-03-01T00:00:00.000Z",
        },
      ],
      totalCostUsdc: (parseFloat(DEMO_COST_EXA) * 2).toFixed(6),
    };
  }

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
