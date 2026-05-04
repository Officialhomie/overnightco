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
        <label className="mb-1.5 block text-xs text-[#a1a1aa]">Default category</label>
        <input
          type="text"
          value={values.defaultCategory}
          onChange={(e) => set("defaultCategory", e.target.value)}
          className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e]"
        />
        <p className="mt-1 text-xs text-[#52525b]">Used by the nightly cron job</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-[#a1a1aa]">Human price (USDC)</label>
          <input
            type="text"
            value={values.humanPriceUsdc}
            onChange={(e) => set("humanPriceUsdc", e.target.value)}
            className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[#a1a1aa]">Agent price (USDC)</label>
          <input
            type="text"
            value={values.agentPriceUsdc}
            onChange={(e) => set("agentPriceUsdc", e.target.value)}
            className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-[#a1a1aa]">Payout wallet address</label>
        <input
          type="text"
          value={values.payoutWalletAddress}
          onChange={(e) => set("payoutWalletAddress", e.target.value)}
          placeholder="0x..."
          className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs text-[#a1a1aa]">Payout threshold (USDC)</label>
        <input
          type="text"
          value={values.payoutThresholdUsdc}
          onChange={(e) => set("payoutThresholdUsdc", e.target.value)}
          className="w-full rounded border border-[#27272a] bg-[#111111] px-4 py-2.5 text-sm text-[#ededed] outline-none focus:border-[#22c55e]"
        />
        <p className="mt-1 text-xs text-[#52525b]">Minimum profit before sweep</p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="payout-enabled"
          checked={values.isPayoutEnabled}
          onChange={(e) => set("isPayoutEnabled", e.target.checked)}
          className="h-4 w-4 rounded border-[#27272a] bg-[#111111] accent-[#22c55e]"
        />
        <label htmlFor="payout-enabled" className="text-sm text-[#a1a1aa]">
          Enable automatic profit sweeps
        </label>
      </div>

      {error && <p className="text-xs text-[#ef4444]">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded border border-[#22c55e] bg-[#22c55e] px-6 py-2.5 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {saving ? "Saving..." : saved ? "Saved" : "Save settings"}
      </button>
    </form>
  );
}
