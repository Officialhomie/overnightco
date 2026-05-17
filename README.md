# OvernightCo

Give an AI $20 and a niche. Come back tomorrow.

It picks the product, prices it, sells it to humans and other agents, and pays you the profit.

This isn't a content site. It's a business — with cost of goods sold, a margin, and a quit decision.

Your $20 is the only input. The P&L is the only output.

---

## Live Demo

- **Agent backend + Locus Checkout:** https://overnightco.vercel.app
- **LocusFounder storefront:** https://svc-mp9pjv3pc4qow92z.buildwithlocus.com
- **Business plan (AI-generated):** https://api.locusfounder.com/api/onboarding/prospect/de5e79f9-4f53-4449-a78f-6bd72723b205/plan.pdf
- **Devfolio submission:** https://devfolio.co/projects/overnightco-9b5b

### Try it as an agent

```bash
# Discover the catalog
curl https://overnightco.vercel.app/llms.txt
curl https://overnightco.vercel.app/api/catalog

# Trigger a demo cycle
curl -X POST https://overnightco.vercel.app/api/agent/start \
  -H "Content-Type: application/json" \
  -d '{"category":"bootstrapped SaaS revenue intelligence","depositAmountUsdc":"20.00"}'
```

---

## How It Works

**Phase 1 — Decide**: The agent scores candidate niches using `expected_value = revenue × probability − cost`. It picks one and explains why.

**Phase 2 — Build**: The agent uses Locus Wrapped APIs (Exa for research, Claude for writing) to produce the product. Every API call deducts USDC from the agent wallet. Costs are logged in real time.

**Phase 3 — Sell**: Two pricing tiers for the same content:
- Human readers: $2.00 USDC via Locus Checkout (formatted article)
- AI agent buyers: $0.50 USDC via HTTP 402 (raw JSON data endpoint)

Pay $2 to read the article. Or $0.50 if you're an AI. The price difference is the AI's idea.

**Phase 4 — Report**: When the profit threshold is reached, the agent sweeps net profit to your wallet via Locus pay/send, writes an exec summary, and decides: continue, pivot, or shut down.

---

## Stack

- **Next.js 15** (App Router) + **React 19**
- **Drizzle ORM** + **Neon PostgreSQL**
- **Locus APIs**: Wrapped APIs, Checkout, HTTP 402, pay/send
- **Vercel** deployment with cron jobs
- **TypeScript** strict mode

---

## Locus APIs Used

| API | Purpose |
|-----|---------|
| Wrapped APIs (Exa, Claude) | Research + content generation (agent cost side) |
| Checkout | Human-tier $2 subscriptions |
| HTTP 402 / MPP | Agent-tier $0.50 data access |
| pay/send | Morning profit sweep to owner wallet |
| balance | Real-time wallet monitoring |

---

## Quick Start

```bash
cp web/.env.example web/.env
# Fill in LOCUS_API_KEY, DATABASE_URL, AUTH_SECRET, CRON_SECRET, ACCESS_TOKEN_SECRET

cd web
npm install
npm run db:push
npm run seed:owner
npm run dev
```

Then visit `http://localhost:3000` and deposit $20 to start the first cycle.

---

## Agent Discovery

AI agents can discover and buy products autonomously:

```
GET /llms.txt                           # skill.md format — discover the catalog
GET /api/catalog                        # JSON catalog of all available products
POST /api/product/{id}/subscribe        # {"buyerType":"AGENT"} → get checkout URL
POST /api/product/{id}/subscribe/confirm # {"sessionId":"..."} → get access token
GET /product/{id}/data.json             # 402 → pay → get raw JSON data
```

---

Built for Locus Paygentic Week 4 — "Using LocusFounder to build a business"
