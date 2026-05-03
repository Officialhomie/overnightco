import "server-only";

import { callClaude } from "@/lib/locus/wrapped-apis";
import { logger } from "@/lib/logger";
import type { ResearchResult } from "./researcher";

export interface WrittenContent {
  title: string;
  teaser: string;
  humanHtml: string;
  agentJson: string;
  totalCostUsdc: string;
}

function formatResearchForPrompt(research: ResearchResult): string {
  const stories = research.topStories
    .map((s, i) => `${i + 1}. ${s.title}\n   ${s.snippet}\n   Source: ${s.url}`)
    .join("\n\n");

  const dataPoints = research.dataPoints
    .map((d, i) => `${i + 1}. ${d.title}\n   ${d.snippet}`)
    .join("\n\n");

  return `TOP STORIES:\n${stories}\n\nDATA POINTS:\n${dataPoints}`;
}

/**
 * Generate human-readable newsletter HTML and machine-readable JSON
 * using Claude via Locus Wrapped APIs.
 */
export async function writeContent(
  topic: string,
  research: ResearchResult,
  opts: { productId: string; cycleId: string },
): Promise<WrittenContent> {
  logger.info("writer.start", { topic, ...opts });

  const researchText = formatResearchForPrompt(research);

  // Generate human-readable newsletter
  const humanPrompt = `Based on this research, write a concise intelligence brief for human readers.

Topic: ${topic}
Research:
${researchText}

Write a 400-600 word brief with:
1. A compelling title (max 80 chars)
2. One-sentence teaser/summary
3. 3-4 key insights with brief explanations
4. Source references

Format as HTML with proper h1, h2, p, ul/li tags. Keep it professional and data-driven.
Start with <h1>title</h1> on the first line, then <p class="teaser">one sentence summary</p>.`;

  const [humanResult, agentResult] = await Promise.all([
    callClaude(humanPrompt, {
      productId: opts.productId,
      cycleId: opts.cycleId,
      systemPrompt: "You are a financial intelligence analyst. Write clear, factual briefs.",
      maxTokens: 1500,
    }),
    callClaude(
      `Based on this research on "${topic}", return a structured JSON object (no markdown, pure JSON) with these fields:
{
  "topic": "${topic}",
  "generatedAt": "ISO timestamp",
  "summary": "2-3 sentence summary",
  "keyMetrics": [{"name": "metric name", "value": "value", "trend": "up/down/stable"}],
  "topStories": [{"title": "...", "url": "...", "relevance": "why this matters"}],
  "signals": ["key signal 1", "key signal 2", "key signal 3"],
  "sources": ["url1", "url2"]
}

Research data:
${researchText}`,
      {
        productId: opts.productId,
        cycleId: opts.cycleId,
        systemPrompt: "Return only valid JSON. No markdown code blocks.",
        maxTokens: 1000,
      },
    ),
  ]);

  const totalCost = (
    parseFloat(humanResult.costUsdc) +
    parseFloat(agentResult.costUsdc)
  ).toFixed(6);

  // Extract title and teaser from human HTML
  const titleMatch = humanResult.data.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const teaserMatch = humanResult.data.match(/<p[^>]*class="teaser"[^>]*>(.*?)<\/p>/i);

  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : `${topic} Intelligence Brief`;
  const teaser = teaserMatch
    ? teaserMatch[1].replace(/<[^>]+>/g, "").trim()
    : `Latest intelligence on ${topic}`;

  // Validate the agent JSON is parseable
  let agentJson = agentResult.data.trim();
  try {
    JSON.parse(agentJson);
  } catch {
    // Fallback: extract JSON from markdown code block if Claude wrapped it
    const jsonMatch = agentJson.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      agentJson = jsonMatch[1].trim();
    }
  }

  logger.info("writer.complete", { title, totalCostUsdc: totalCost });

  return {
    title,
    teaser,
    humanHtml: humanResult.data,
    agentJson,
    totalCostUsdc: totalCost,
  };
}
