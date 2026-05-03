import "server-only";

function require(key: string): string {
  const val = process.env[key]?.trim();
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback = ""): string {
  return process.env[key]?.trim() ?? fallback;
}

export const env = {
  // Locus
  locusApiKey: require("LOCUS_API_KEY"),
  locusApiBase: optional("LOCUS_API_BASE", "https://beta-api.paywithlocus.com/api"),
  locusWebhookSecret: optional("LOCUS_WEBHOOK_SECRET"),

  // Database
  databaseUrl: require("DATABASE_URL"),

  // Auth
  authSecret: require("AUTH_SECRET"),
  authUrl: optional("AUTH_URL", "http://localhost:3000"),
  appUrl: optional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

  // Scheduling
  cronSecret: optional("CRON_SECRET"),

  // Access tokens
  accessTokenSecret: require("ACCESS_TOKEN_SECRET"),

  // Content pricing
  humanPriceUsdc: optional("HUMAN_PRICE_USDC", "2.00"),
  agentPriceUsdc: optional("AGENT_PRICE_USDC", "0.50"),

  // Payout
  defaultPayoutWallet: optional("DEFAULT_PAYOUT_WALLET"),

  // Demo mode
  isDemoMode: optional("DEMO_MODE", "false") === "true",

  // Dev
  isMockLocus: optional("MOCK_LOCUS", "") === "1",
} as const;
