"use client";

import { useState } from "react";

interface SettingsFormProps {
  defaultValues: {
    defaultCategory: string;
    humanPriceUsdc: string;
    agentPriceUsdc: string;
    payoutWalletAddress: string;
    payoutThresholdUsdc: string;
    isPayoutEnabled: boolean;
  };
}

const inputClass =
  "min-h-11 w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus-visible:border-[#22c55e] focus-visible:ring-2 focus-visible:ring-[#22c55e]/30";

export function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [values, setValues] = useState(defaultValues);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof values, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setError(d.error ?? "Failed to save");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-6">
      <div>
        <label htmlFor="settings-default-category" className="mb-1.5 block text-xs text-[#a1a1aa]">
          Default category
        </label>
        <input
          id="settings-default-category"
          type="text"
          value={values.defaultCategory}
          onChange={(e) => set("defaultCategory", e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[#52525b]">Used by the nightly cron job</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="settings-human-price" className="mb-1.5 block text-xs text-[#a1a1aa]">
            Human price (USDC)
          </label>
          <input
            id="settings-human-price"
            type="text"
            inputMode="decimal"
            value={values.humanPriceUsdc}
            onChange={(e) => set("humanPriceUsdc", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="settings-agent-price" className="mb-1.5 block text-xs text-[#a1a1aa]">
            Agent price (USDC)
          </label>
          <input
            id="settings-agent-price"
            type="text"
            inputMode="decimal"
            value={values.agentPriceUsdc}
            onChange={(e) => set("agentPriceUsdc", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="settings-payout-wallet" className="mb-1.5 block text-xs text-[#a1a1aa]">
          Payout wallet address
        </label>
        <input
          id="settings-payout-wallet"
          type="text"
          value={values.payoutWalletAddress}
          onChange={(e) => set("payoutWalletAddress", e.target.value)}
          placeholder="0x..."
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="settings-payout-threshold" className="mb-1.5 block text-xs text-[#a1a1aa]">
          Payout threshold (USDC)
        </label>
        <input
          id="settings-payout-threshold"
          type="text"
          inputMode="decimal"
          value={values.payoutThresholdUsdc}
          onChange={(e) => set("payoutThresholdUsdc", e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[#52525b]">Minimum profit before sweep</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="payout-enabled"
          checked={values.isPayoutEnabled}
          onChange={(e) => set("isPayoutEnabled", e.target.checked)}
          className="h-4 w-4 rounded border-[#27272a] bg-[#111111] accent-[#22c55e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        />
        <label htmlFor="payout-enabled" className="text-sm text-[#a1a1aa]">
          Enable automatic profit sweeps
        </label>
      </div>

      <div className="min-h-5" aria-live="polite" aria-atomic="true">
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
        {saved && !error && <p className="text-xs text-[#22c55e]">Settings saved.</p>}
      </div>

      <button
        type="submit"
        disabled={saving}
        aria-busy={saving}
        className="min-h-11 rounded border border-[#22c55e] bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:opacity-40"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
      </button>
    </form>
  );
}
