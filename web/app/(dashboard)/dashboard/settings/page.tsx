import { db } from "@/lib/db";
import { newsletterSettings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/dashboard/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings] = await db.select().from(newsletterSettings).limit(1);

  return (
    <div>
      {/* Sticky header */}
      <header className="flex items-center h-16 border-b border-[#3d4a3d] bg-[#0e150e] sticky top-0 z-40 px-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#4be277] pulse-dot" />
            <h1 className="text-[20px] font-bold text-[#dce5d9] tracking-tighter uppercase">
              Settings<span className="terminal-cursor" aria-hidden />
            </h1>
          </div>
          <p className="font-mono text-[12px] text-[#bccbb9] mt-0.5">
            Configure system parameters and financial routing protocols.
          </p>
        </div>
      </header>

      <div className="px-6 py-6">
        <SettingsForm
          defaultValues={{
            defaultCategory: settings?.defaultCategory ?? "AI & crypto market intelligence",
            humanPriceUsdc: settings?.humanPriceUsdc ?? "2.00",
            agentPriceUsdc: settings?.agentPriceUsdc ?? "0.50",
            payoutWalletAddress: settings?.payoutWalletAddress ?? "",
            payoutThresholdUsdc: settings?.payoutThresholdUsdc ?? "5.00",
            isPayoutEnabled: settings?.isPayoutEnabled ?? false,
          }}
        />
      </div>
    </div>
  );
}
