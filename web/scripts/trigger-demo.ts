/**
 * Trigger a time-compressed demo loop (90 seconds).
 * Run: npx tsx scripts/trigger-demo.ts
 *
 * With DEMO_MODE=true (set in env), the agent uses cached API responses
 * and skips sleep delays for a fast in-browser demo.
 */
import "dotenv/config";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET env var not set");
  process.exit(1);
}

const category =
  process.argv[2] ?? "Base ecosystem analytics";

async function post(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CRON_SECRET}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    console.error(`[${path}] Error ${res.status}:`, data);
    process.exit(1);
  }
  return data;
}

async function main() {
  console.log(`\nOvernightCo demo — category: "${category}"`);
  console.log("=".repeat(50));

  console.log("\n[1/2] Triggering DECIDE + BUILD phase...");
  const build = await post("/api/internal/build", { category });
  console.log(`  Niche:   ${build.selectedNiche}`);
  console.log(`  Product: ${build.productUrl}`);
  console.log(`  Cycle:   ${build.cycleId}`);

  console.log("\n[2/2] Triggering REPORT phase...");
  const report = await post("/api/internal/report", { cycleId: build.cycleId });
  console.log(`  Decision: ${report.cycleDecision}`);
  console.log(`  Reason:   ${report.cycleReason}`);
  console.log(`  Revenue:  $${(report.pnl as Record<string,string>).revenueUsdc}`);
  console.log(`  Costs:    $${(report.pnl as Record<string,string>).costsUsdc}`);
  console.log(`  Profit:   $${(report.pnl as Record<string,string>).profitUsdc}`);

  console.log("\n=".repeat(50));
  console.log("Demo complete.");
  console.log(`Dashboard: ${BASE_URL}/dashboard`);
  console.log(`Product:   ${build.productUrl}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
