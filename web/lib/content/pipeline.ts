import "server-only";

import { researchTopic } from "./researcher";
import { writeContent } from "./writer";
import { logger } from "@/lib/logger";

export interface PipelineResult {
  title: string;
  teaser: string;
  humanHtml: string;
  agentJson: string;
  researchSources: string[];
  totalCostUsdc: string;
  costBreakdown: {
    researchCostUsdc: string;
    writingCostUsdc: string;
  };
}

/**
 * Full content pipeline: research → write → return results.
 * All Locus Wrapped API costs are recorded against productId.
 */
export async function runContentPipeline(
  topic: string,
  opts: { productId: string; cycleId: string },
): Promise<PipelineResult> {
  logger.info("pipeline.start", { topic, ...opts });

  const research = await researchTopic(topic, opts);
  const content = await writeContent(topic, research, opts);

  const researchSources = [
    ...research.topStories.map((s) => s.url),
    ...research.dataPoints.map((d) => d.url),
  ].filter(Boolean);

  const totalCost = (
    parseFloat(research.totalCostUsdc) +
    parseFloat(content.totalCostUsdc)
  ).toFixed(6);

  logger.info("pipeline.complete", {
    title: content.title,
    totalCostUsdc: totalCost,
    sourceCount: researchSources.length,
  });

  return {
    title: content.title,
    teaser: content.teaser,
    humanHtml: content.humanHtml,
    agentJson: content.agentJson,
    researchSources,
    totalCostUsdc: totalCost,
    costBreakdown: {
      researchCostUsdc: research.totalCostUsdc,
      writingCostUsdc: content.totalCostUsdc,
    },
  };
}
