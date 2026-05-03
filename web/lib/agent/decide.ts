import "server-only";

import { callClaude } from "@/lib/locus/wrapped-apis";
import { db } from "@/lib/db";
import { nicheScores, aiDecisions, businessCycles } from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

export interface NicheCandidate {
  name: string;
  description: string;
  estimatedRevenueUsdc: number;
  probabilityScore: number;
  estimatedCostUsdc: number;
  expectedValueUsdc: number;
}

export interface NicheDecision {
  selectedNiche: string;
  selectedDescription: string;
  reason: string;
  candidates: Array<NicheCandidate & { decision: "SELECTED" | "REJECTED"; decisionReason: string }>;
  costUsdc: string;
}

const DECIDE_SYSTEM_PROMPT = `You are an autonomous business agent making a financial decision.
You will score candidate niches for a content intelligence product using expected value math.
Be direct, analytical, and economically rational. Return only valid JSON.`;

/**
 * Score candidate niches using expected_value = revenue × probability − cost.
 * The winning niche is selected by highest expected value.
 * All reasoning is logged to aiDecisions for dashboard transparency.
 */
export async function scoreNiches(
  category: string,
  cycleId: string,
): Promise<NicheDecision> {
  logger.info("agent.decide.start", { category, cycleId });

  const prompt = `You are deciding which niche to cover for an AI-published intelligence product.

Category: "${category}"

Your product has two revenue streams:
- Human readers: $2.00 USDC per article (conversion rate ~15%)
- AI agent buyers: $0.50 USDC per raw data report (conversion rate ~5%)

Cost to produce one article: ~$0.50 USDC (Exa search + Claude writing via API)

Generate exactly 3 specific niche candidates within this category.
For each, calculate:
- estimated_revenue_usdc: Expected revenue per 24h cycle (be realistic, not optimistic)
- probability_score: 0.0-1.0 probability of reaching that revenue
- estimated_cost_usdc: API cost to produce the content
- expected_value_usdc: (estimated_revenue × probability) - cost

Return ONLY this JSON (no markdown, no explanation outside JSON):
{
  "candidates": [
    {
      "name": "specific niche name (max 60 chars)",
      "description": "what this product covers (max 200 chars)",
      "estimated_revenue_usdc": 6.00,
      "probability_score": 0.25,
      "estimated_cost_usdc": 0.50,
      "expected_value_usdc": 1.00,
      "decision": "SELECTED" or "REJECTED",
      "decision_reason": "why selected or rejected (max 150 chars)"
    }
  ],
  "selected_index": 0,
  "selection_reason": "why the selected niche wins (max 200 chars)"
}

Only one candidate should have "decision": "SELECTED". Select the highest expected_value_usdc.`;

  const result = await callClaude(prompt, {
    cycleId,
    systemPrompt: DECIDE_SYSTEM_PROMPT,
    maxTokens: 800,
  });

  // Parse the AI response
  let parsed: {
    candidates: Array<{
      name: string;
      description: string;
      estimated_revenue_usdc: number;
      probability_score: number;
      estimated_cost_usdc: number;
      expected_value_usdc: number;
      decision: "SELECTED" | "REJECTED";
      decision_reason: string;
    }>;
    selected_index: number;
    selection_reason: string;
  };

  try {
    let json = result.data.trim();
    // Strip markdown code block if present
    const match = json.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) json = match[1].trim();
    parsed = JSON.parse(json);
  } catch (e) {
    logger.error("agent.decide.parse_failed", { error: String(e), raw: result.data.slice(0, 500) });
    // Fallback: use the category directly as the niche
    parsed = {
      candidates: [
        {
          name: category,
          description: `Intelligence brief covering ${category}`,
          estimated_revenue_usdc: 4.00,
          probability_score: 0.20,
          estimated_cost_usdc: 0.50,
          expected_value_usdc: 0.30,
          decision: "SELECTED",
          decision_reason: "Fallback selection — AI parsing failed",
        },
      ],
      selected_index: 0,
      selection_reason: "Fallback to input category",
    };
  }

  // Persist niche scores to DB
  for (const candidate of parsed.candidates) {
    await db.insert(nicheScores).values({
      cycleId,
      nicheName: candidate.name,
      nicheDescription: candidate.description,
      estimatedRevenueUsdc: String(candidate.estimated_revenue_usdc),
      probabilityScore: String(candidate.probability_score),
      estimatedCostUsdc: String(candidate.estimated_cost_usdc),
      expectedValueUsdc: String(candidate.expected_value_usdc),
      decision: candidate.decision,
      decisionReason: candidate.decision_reason,
    });
  }

  // Log AI decision to dashboard
  await db.insert(aiDecisions).values({
    cycleId,
    phase: "DECIDE",
    prompt: prompt.slice(0, 2000),
    reasoning: JSON.stringify(parsed.candidates.map((c) => ({
      name: c.name,
      ev: c.expected_value_usdc,
      decision: c.decision,
    }))),
    decision: parsed.selection_reason,
    costUsdc: result.costUsdc,
  });

  const selected = parsed.candidates[parsed.selected_index] ?? parsed.candidates[0];

  // Update cycle with selected niche
  await db
    .update(businessCycles)
    .set({ ownerInput: selected.name })
    .where(eq(businessCycles.id, cycleId));

  logger.info("agent.decide.complete", {
    selected: selected.name,
    expectedValue: selected.expected_value_usdc,
    costUsdc: result.costUsdc,
  });

  return {
    selectedNiche: selected.name,
    selectedDescription: selected.description,
    reason: parsed.selection_reason,
    candidates: parsed.candidates.map((c) => ({
      name: c.name,
      description: c.description,
      estimatedRevenueUsdc: c.estimated_revenue_usdc,
      probabilityScore: c.probability_score,
      estimatedCostUsdc: c.estimated_cost_usdc,
      expectedValueUsdc: c.expected_value_usdc,
      decision: c.decision,
      decisionReason: c.decision_reason,
    })),
    costUsdc: result.costUsdc,
  };
}
