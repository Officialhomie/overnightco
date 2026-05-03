import "server-only";

import { LocusClient } from "./client";
import { logger } from "@/lib/logger";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export interface ExaSearchResult {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface WrappedApiResult<T> {
  data: T;
  costUsdc: string;
  locusTransactionId?: string;
}

function extractCost(response: Record<string, unknown>): string {
  // Locus Wrapped API should return the cost deducted from wallet
  const cost =
    (typeof response.cost_usdc === "number" && response.cost_usdc) ||
    (typeof response.costUsdc === "number" && response.costUsdc) ||
    (typeof response.amount_deducted === "number" && response.amount_deducted) ||
    0;
  return cost.toFixed(6);
}

function extractTransactionId(response: Record<string, unknown>): string | undefined {
  return (
    (typeof response.transaction_id === "string" && response.transaction_id) ||
    (typeof response.transactionId === "string" && response.transactionId) ||
    undefined
  );
}

async function recordCostTransaction(opts: {
  type: "COST_EXA" | "COST_CLAUDE" | "COST_STABILITY";
  amountUsdc: string;
  productId?: string;
  cycleId?: string;
  locusTransactionId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(transactions).values({
    type: opts.type,
    amountUsdc: opts.amountUsdc,
    productId: opts.productId ?? null,
    cycleId: opts.cycleId ?? null,
    locusTransactionId: opts.locusTransactionId ?? null,
    description: opts.description,
    metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
  });
}

/**
 * Call Exa search via Locus Wrapped APIs.
 * Each call deducts USDC from the agent wallet and records a COST_EXA transaction.
 *
 * NOTE: The exact Locus Wrapped API endpoint path needs to be confirmed.
 * Using /wrapped/exa as the expected path — verify against Locus docs on Day 1.
 */
export async function callExa(
  query: string,
  opts: { productId?: string; cycleId?: string; numResults?: number },
): Promise<WrappedApiResult<ExaSearchResult[]>> {
  if (process.env.MOCK_LOCUS === "1") {
    const mockResults: ExaSearchResult[] = [
      {
        title: `[Mock] Latest trends in ${query}`,
        url: "https://example.com/article-1",
        snippet: "This is a mock research result for demo purposes.",
        publishedDate: new Date().toISOString(),
      },
      {
        title: `[Mock] Analysis: ${query}`,
        url: "https://example.com/article-2",
        snippet: "Another mock result showing key data points.",
        publishedDate: new Date().toISOString(),
      },
    ];
    const mockCost = "0.12";
    if (opts.productId || opts.cycleId) {
      await recordCostTransaction({
        type: "COST_EXA",
        amountUsdc: mockCost,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: `Exa search: "${query.slice(0, 60)}"`,
        metadata: { query, mock: true },
      });
    }
    return { data: mockResults, costUsdc: mockCost };
  }

  const client = new LocusClient();

  // Locus Wrapped API call — path TBC, defensive structure
  const res = await client.request<Record<string, unknown>>("/wrapped/exa", {
    method: "POST",
    body: JSON.stringify({
      query,
      numResults: opts.numResults ?? 5,
    }),
  });

  if (!res.success) {
    logger.error("wrapped_api.exa_failed", { query, error: res.error });
    throw new Error(`Exa Wrapped API failed: ${res.error}`);
  }

  const data = res.data as Record<string, unknown>;
  const costUsdc = extractCost(data);
  const locusTransactionId = extractTransactionId(data);

  // Extract results — defensive field picking for beta API instability
  const rawResults =
    (Array.isArray(data.results) && data.results) ||
    (Array.isArray(data.data) && data.data) ||
    [];

  const results: ExaSearchResult[] = rawResults.map((r: Record<string, unknown>) => ({
    title: String(r.title ?? r.name ?? ""),
    url: String(r.url ?? r.link ?? ""),
    snippet: String(r.snippet ?? r.text ?? r.description ?? ""),
    publishedDate: typeof r.publishedDate === "string" ? r.publishedDate : undefined,
  }));

  if (opts.productId || opts.cycleId) {
    await recordCostTransaction({
      type: "COST_EXA",
      amountUsdc: costUsdc,
      productId: opts.productId,
      cycleId: opts.cycleId,
      locusTransactionId,
      description: `Exa search: "${query.slice(0, 60)}"`,
      metadata: { query, resultCount: results.length },
    });
  }

  logger.info("wrapped_api.exa_success", { query, resultCount: results.length, costUsdc });

  return { data: results, costUsdc, locusTransactionId };
}

/**
 * Call Claude via Locus Wrapped APIs.
 * Each call deducts USDC from the agent wallet and records a COST_CLAUDE transaction.
 *
 * NOTE: Exact endpoint path TBC — verify against Locus docs on Day 1.
 */
export async function callClaude(
  prompt: string,
  opts: {
    productId?: string;
    cycleId?: string;
    model?: string;
    maxTokens?: number;
    systemPrompt?: string;
  },
): Promise<WrappedApiResult<string>> {
  if (process.env.MOCK_LOCUS === "1") {
    const mockContent = `[Mock AI Response]\n\nThis is a mock response for the prompt: "${prompt.slice(0, 100)}..."\n\nIn production, Claude will generate real content here based on actual research data.`;
    const mockCost = "0.31";
    if (opts.productId || opts.cycleId) {
      await recordCostTransaction({
        type: "COST_CLAUDE",
        amountUsdc: mockCost,
        productId: opts.productId,
        cycleId: opts.cycleId,
        description: `Claude: ${(opts.systemPrompt ?? prompt).slice(0, 60)}`,
        metadata: { promptLength: prompt.length, mock: true },
      });
    }
    return { data: mockContent, costUsdc: mockCost };
  }

  const client = new LocusClient();

  const messages = [{ role: "user", content: prompt }];
  const body: Record<string, unknown> = {
    model: opts.model ?? "claude-sonnet-4-6",
    messages,
    max_tokens: opts.maxTokens ?? 2000,
  };
  if (opts.systemPrompt) {
    body.system = opts.systemPrompt;
  }

  const res = await client.request<Record<string, unknown>>("/wrapped/anthropic", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.success) {
    logger.error("wrapped_api.claude_failed", { error: res.error });
    throw new Error(`Claude Wrapped API failed: ${res.error}`);
  }

  const data = res.data as Record<string, unknown>;
  const costUsdc = extractCost(data);
  const locusTransactionId = extractTransactionId(data);

  // Extract content — defensive for Anthropic response envelope
  const content =
    (typeof data.content === "string" && data.content) ||
    (Array.isArray(data.content) &&
      data.content
        .map((c: Record<string, unknown>) => String(c.text ?? ""))
        .join("")) ||
    (typeof data.text === "string" && data.text) ||
    "";

  if (opts.productId || opts.cycleId) {
    await recordCostTransaction({
      type: "COST_CLAUDE",
      amountUsdc: costUsdc,
      productId: opts.productId,
      cycleId: opts.cycleId,
      locusTransactionId,
      description: `Claude: ${(opts.systemPrompt ?? prompt).slice(0, 60)}`,
      metadata: { promptLength: prompt.length, contentLength: content.length },
    });
  }

  logger.info("wrapped_api.claude_success", { contentLength: content.length, costUsdc });

  return { data: content, costUsdc, locusTransactionId };
}
