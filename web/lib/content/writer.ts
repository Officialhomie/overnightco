import "server-only";

import { callClaude } from "@/lib/locus/wrapped-apis";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
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
    .map((s, i) => `${i + 1}. ${s.title}\n   ${s.text}\n   Source: ${s.url}`)
    .join("\n\n");

  const dataPoints = research.dataPoints
    .map((d, i) => `${i + 1}. ${d.title}\n   ${d.text}`)
    .join("\n\n");

  return `TOP STORIES:\n${stories}\n\nDATA POINTS:\n${dataPoints}`;
}

const DEMO_COST_CLAUDE = "0.002200";

/**
 * Generate human-readable newsletter HTML and machine-readable JSON
 * using Claude via Locus Wrapped APIs.
 */
export async function writeContent(
  topic: string,
  research: ResearchResult,
  opts: { productId: string; cycleId: string },
): Promise<WrittenContent> {
  // DEMO_MODE: skip Claude, return pre-written content instantly
  if (process.env.DEMO_MODE === "true") {
    await db.insert(transactions).values([
      {
        type: "COST_CLAUDE",
        amountUsdc: DEMO_COST_CLAUDE,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: "Claude: human brief (demo)",
      },
      {
        type: "COST_CLAUDE",
        amountUsdc: DEMO_COST_CLAUDE,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: "Claude: agent JSON (demo)",
      },
    ]);
    const demoHtml = `<h1>The Thrift Flip Opportunity Report 2025</h1>
<p class="teaser">Thrift flipping has emerged as one of Q2 2025's most accessible side hustles, with part-time operators averaging $800–$2,400/month from budgets as low as $50.</p>
<h2>Executive Summary</h2>
<p>The secondhand market crossed $43 billion in 2024 and is projected to reach $70 billion by 2027. Thrift-sourced reselling captures an estimated 12% of this value — approximately $5.2 billion annually. The key driver: a persistent arbitrage gap between donor-priced thrift goods and market-rate demand on digital platforms.</p>
<h2>Top-Performing Categories (Q2 2025)</h2>
<ul>
<li><strong>Branded sportswear</strong> — average 8-15x flip ratio. Nike Air Force 1s at $4-8 sell for $45-95 on Depop.</li>
<li><strong>Vintage Levi's 501s</strong> — most consistent performer: $5-12 acquisition, $35-75 sale.</li>
<li><strong>Y2K fashion</strong> — experiencing resurgence with Gen Z buyers; margins 6-12x.</li>
<li><strong>Outdoor gear</strong> — undervalued at thrift; strong demand on eBay and Facebook Marketplace.</li>
</ul>
<h2>Platform Analysis</h2>
<p>Depop (10% fee) and Poshmark (20% over $15) dominate for apparel. eBay reaches 185 million buyers at 13.25% fees. Facebook Marketplace optimal for bulky items, eliminating shipping complexity.</p>
<h2>Operational Framework</h2>
<p>Successful operators follow a 3-visit weekly sourcing rhythm: Monday (Goodwill rotation), Wednesday (Savers), Saturday (estate sales). Photography quality drives 40% of conversion rate variance. Items priced 15% below comparable listings sell 3x faster.</p>
<h2>Sources</h2>
<ul>
<li><a href="https://smallbiztrends.com/thrift-store-flipping/">Small Biz Trends — Thrift Store Flipping Guide 2025</a></li>
<li><a href="https://www.moneytalksnews.com/amtn-how-to-resell-secondhand-items/">Money Talks News — $1k/month thrift reselling</a></li>
<li><a href="https://www.underpriced.app/blog/ultimate-thrift-store-flipping-guide">Underpriced — Ultimate Thrift Flipping Guide</a></li>
</ul>`;
    const demoJson = JSON.stringify({
      topic,
      generatedAt: new Date().toISOString(),
      summary: "Thrift flipping delivers $800-$2,400/month part-time. Branded sportswear leads with 8-15x flip ratios. Platform fee comparison: Depop 10%, Poshmark 20%, eBay 13.25%.",
      keyMetrics: [
        { name: "Market size 2024", value: "$43B", trend: "up" },
        { name: "Projected 2027", value: "$70B", trend: "up" },
        { name: "Avg PT monthly income", value: "$800-$2,400", trend: "up" },
        { name: "Sportswear flip ratio", value: "8-15x", trend: "stable" },
      ],
      topStories: [
        { title: "2025 Thrift Flipping Guide: $4k/month from $200 starting budget", url: "https://smallbiztrends.com/thrift-store-flipping/", relevance: "Current market data and platform strategy" },
        { title: "Here's How I Make $1,000 a Month Selling Thrift Store Finds Online", url: "https://www.moneytalksnews.com/amtn-how-to-resell-secondhand-items/", relevance: "Real income breakdown from active flipper" },
      ],
      signals: [
        "Branded sportswear 8-15x flip ratio is peak Q2 2025 opportunity",
        "Y2K fashion resurgence driving Gen Z demand on Depop and Poshmark",
        "Estate sales outperforming thrift stores for high-value items",
      ],
      sources: ["https://smallbiztrends.com/thrift-store-flipping/", "https://www.moneytalksnews.com/amtn-how-to-resell-secondhand-items/", "https://www.underpriced.app/blog/ultimate-thrift-store-flipping-guide"],
    });
    return {
      title: "The Thrift Flip Opportunity Report 2025",
      teaser: "Thrift flipping has emerged as one of Q2 2025's most accessible side hustles, with part-time operators averaging $800–$2,400/month from budgets as low as $50.",
      humanHtml: demoHtml,
      agentJson: demoJson,
      totalCostUsdc: (parseFloat(DEMO_COST_CLAUDE) * 2).toFixed(6),
    };
  }

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
