import "server-only";

import type { LocusResponse } from "./types";
import { logger } from "@/lib/logger";
import { backoffMs, RETRYABLE_HTTP_STATUS, sleep } from "@/lib/utils/retry";

const DEFAULT_BETA_BASE = "https://beta-api.paywithlocus.com/api";
const MAX_ATTEMPTS = 3;

function resolveApiKey(): string {
  const key = process.env.LOCUS_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing LOCUS_API_KEY");
  }
  return key;
}

function resolveApiBase(): string {
  const base = process.env.LOCUS_API_BASE?.trim() ?? DEFAULT_BETA_BASE;
  return base.replace(/\/$/, "");
}

export class LocusClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? resolveApiKey();
    this.baseUrl = (opts?.baseUrl ?? resolveApiBase()).replace(/\/$/, "");
  }

  private url(path: string): string {
    const p = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${p}`;
  }

  async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<LocusResponse<T>> {
    const requestInit: RequestInit = {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    };

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(this.url(path), {
          ...requestInit,
          signal: AbortSignal.timeout(45_000),
        });
        if (RETRYABLE_HTTP_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
          logger.warn("locus.retryable_status", {
            path,
            status: res.status,
            attempt,
          });
          await res.text().catch(() => undefined);
          await sleep(backoffMs(attempt));
          continue;
        }
        const json = (await res.json()) as LocusResponse<T>;
        return json;
      } catch (error) {
        lastError = error;
        logger.warn("locus.request_failed", {
          path,
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        if (attempt < MAX_ATTEMPTS) {
          await sleep(backoffMs(attempt));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Locus request failed");
  }
}
