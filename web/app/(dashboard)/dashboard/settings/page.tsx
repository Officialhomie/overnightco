import { db } from "@/lib/db";
import { newsletterSettings } from "@/lib/db/schema";
import { SettingsForm } from "@/components/dashboard/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings] = await db.select().from(newsletterSettings).limit(1);

  return (
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-[#71717a]">
          Configure the AI agent&apos;s default behavior and payout settings.
        </p>
      </div>

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
  );
}
