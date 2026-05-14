import { isNotNull } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const productStatusEnum = pgEnum("product_status", [
  "DECIDING",
  "BUILDING",
  "LIVE",
  "ARCHIVED",
  "FAILED",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "REVENUE_HUMAN",
  "REVENUE_AGENT",
  "COST_EXA",
  "COST_CLAUDE",
  "COST_STABILITY",
  "COST_BUILD",
  "COST_OTHER",
  "PAYOUT",
]);

export const buyerTypeEnum = pgEnum("oc_buyer_type", [
  "HUMAN",
  "AGENT",
]);

export const nicheDecisionEnum = pgEnum("niche_decision", [
  "SELECTED",
  "REJECTED",
]);

export const cycleDecisionEnum = pgEnum("cycle_decision", [
  "CONTINUE",
  "PIVOT",
  "SHUTDOWN",
]);

export const aiPhaseEnum = pgEnum("ai_phase", [
  "DECIDE",
  "BUILD",
  "REPORT",
]);

// ─── owner ────────────────────────────────────────────────────────────────────
// Single row — one owner per deployment. NextAuth Credentials auth.

export const owner = pgTable("owner", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull().default("Owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── newsletter_settings ─────────────────────────────────────────────────────
// Single row — upserted, never duplicated.

export const newsletterSettings = pgTable("newsletter_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  defaultCategory: text("default_category").notNull().default("AI & crypto market intelligence"),
  humanPriceUsdc: text("human_price_usdc").notNull().default("2.00"),
  agentPriceUsdc: text("agent_price_usdc").notNull().default("0.50"),
  payoutWalletAddress: text("payout_wallet_address"),
  payoutThresholdUsdc: text("payout_threshold_usdc").notNull().default("5.00"),
  isPayoutEnabled: boolean("is_payout_enabled").notNull().default(false),
  buildCronSchedule: text("build_cron_schedule").notNull().default("0 2 * * *"),
  reportCronSchedule: text("report_cron_schedule").notNull().default("0 8 * * *"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── business_cycles ─────────────────────────────────────────────────────────
// One per "$20 deposit + niche category" run.

export const businessCycles = pgTable("business_cycles", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerInput: text("owner_input").notNull(),
  depositAmountUsdc: text("deposit_amount_usdc").notNull().default("20.00"),
  cycleDecision: cycleDecisionEnum("cycle_decision"),
  cycleReason: text("cycle_reason"),
  profitSweptUsdc: text("profit_swept_usdc"),
  sweptAt: timestamp("swept_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── niche_scores ─────────────────────────────────────────────────────────────
// AI scoring of candidate niches during the DECIDE phase.

export const nicheScores = pgTable("niche_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").notNull().references(() => businessCycles.id, { onDelete: "cascade" }),
  nicheName: text("niche_name").notNull(),
  nicheDescription: text("niche_description").notNull(),
  estimatedRevenueUsdc: text("estimated_revenue_usdc").notNull(),
  probabilityScore: numeric("probability_score", { precision: 4, scale: 3 }).notNull(),
  estimatedCostUsdc: text("estimated_cost_usdc").notNull(),
  expectedValueUsdc: text("expected_value_usdc").notNull(),
  decision: nicheDecisionEnum("decision").notNull(),
  decisionReason: text("decision_reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── products ─────────────────────────────────────────────────────────────────
// One per built and deployed product. Holds both the human HTML and agent JSON.

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").notNull().references(() => businessCycles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  niche: text("niche").notNull(),
  teaser: text("teaser").notNull(),
  humanHtml: text("human_html"),
  agentJson: text("agent_json"),
  researchSources: text("research_sources"),
  humanPriceUsdc: text("human_price_usdc").notNull().default("2.00"),
  agentPriceUsdc: text("agent_price_usdc").notNull().default("0.50"),
  totalCostUsdc: text("total_cost_usdc").notNull().default("0.00"),
  status: productStatusEnum("status").notNull().default("DECIDING"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── access_grants ────────────────────────────────────────────────────────────
// Records who paid and received access to a product's content.
// Unique on locusSessionId where confirmed (idempotency).

export const accessGrants = pgTable("access_grants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  locusSessionId: text("locus_session_id").notNull(),
  buyerType: buyerTypeEnum("buyer_type").notNull().default("HUMAN"),
  amountUsdc: text("amount_usdc").notNull(),
  webhookSecret: text("webhook_secret"),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sessionUniqueIdx: uniqueIndex("access_grants_session_unique")
    .on(table.locusSessionId)
    .where(isNotNull(table.confirmedAt)),
}));

// ─── transactions ─────────────────────────────────────────────────────────────
// Immutable P&L ledger. Every Locus interaction (cost or revenue) gets a row.
// This is the single source of truth for the P&L dashboard.

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: transactionTypeEnum("type").notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  cycleId: uuid("cycle_id").references(() => businessCycles.id, { onDelete: "set null" }),
  locusSessionId: text("locus_session_id"),
  locusTransactionId: text("locus_transaction_id"),
  buyerType: buyerTypeEnum("buyer_type"),
  description: text("description").notNull(),
  metadata: text("metadata"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── payouts ─────────────────────────────────────────────────────────────────
// Records of profit sweeps to owner wallet (Phase 4 — report).

export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").references(() => businessCycles.id, { onDelete: "set null" }),
  toWalletAddress: text("to_wallet_address").notNull(),
  amountUsdc: text("amount_usdc").notNull(),
  revenueUsdc: text("revenue_usdc").notNull(),
  costsUsdc: text("costs_usdc").notNull(),
  locusTransactionId: text("locus_transaction_id"),
  status: text("status").notNull().default("PENDING"),
  failureReason: text("failure_reason"),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── ai_decisions ─────────────────────────────────────────────────────────────
// Every AI reasoning chain stored for dashboard transparency.
// Judges can inspect why the AI made each decision.

export const aiDecisions = pgTable("ai_decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cycleId: uuid("cycle_id").references(() => businessCycles.id, { onDelete: "set null" }),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  phase: aiPhaseEnum("phase").notNull(),
  prompt: text("prompt").notNull(),
  reasoning: text("reasoning").notNull(),
  decision: text("decision").notNull(),
  costUsdc: text("cost_usdc"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── rate_limits ──────────────────────────────────────────────────────────────

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").defaultRandom().primaryKey(),
  scopeKey: text("scope_key").notNull().unique(),
  windowKey: text("window_key").notNull(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type Owner = typeof owner.$inferSelect;
export type BusinessCycle = typeof businessCycles.$inferSelect;
export type NewBusinessCycle = typeof businessCycles.$inferInsert;
export type NicheScore = typeof nicheScores.$inferSelect;
export type NewNicheScore = typeof nicheScores.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type AccessGrant = typeof accessGrants.$inferSelect;
export type NewAccessGrant = typeof accessGrants.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type BuyerType = (typeof buyerTypeEnum.enumValues)[number];
export type Payout = typeof payouts.$inferSelect;
export type NewPayout = typeof payouts.$inferInsert;
export type AiDecision = typeof aiDecisions.$inferSelect;
export type NewsletterSettings = typeof newsletterSettings.$inferSelect;
