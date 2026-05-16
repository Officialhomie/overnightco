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
  "w-full bg-[#0e150e] border border-[#3d4a3d] focus:border-[#4be277] focus:ring-1 focus:ring-[#4be277] rounded px-4 py-3 font-mono text-sm text-[#dce5d9] outline-none transition-all placeholder:text-[#869585] disabled:opacity-50";

const labelClass = "block font-mono text-[10px] text-[#bccbb9] uppercase tracking-wider mb-2";

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Form — 7 cols */}
      <div className="lg:col-span-7">
        <section className="bg-[#161d16] border border-[#3d4a3d] p-6 rounded">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* System category */}
            <div>
              <label htmlFor="settings-default-category" className={labelClass}>
                System_Category
              </label>
              <input
                id="settings-default-category"
                type="text"
                value={values.defaultCategory}
                onChange={(e) => set("defaultCategory", e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 font-mono text-[10px] text-[#869585]">
                Used by the nightly cron job
              </p>
            </div>

            {/* Pricing — 2 col */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-human-price" className={labelClass}>
                  Human_Rate
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-[#869585] pointer-events-none">
                    $
                  </span>
                  <input
                    id="settings-human-price"
                    type="text"
                    inputMode="decimal"
                    value={values.humanPriceUsdc}
                    onChange={(e) => set("humanPriceUsdc", e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="settings-agent-price" className={labelClass}>
                  Agent_Rate
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-[#869585] pointer-events-none">
                    $
                  </span>
                  <input
                    id="settings-agent-price"
                    type="text"
                    inputMode="decimal"
                    value={values.agentPriceUsdc}
                    onChange={(e) => set("agentPriceUsdc", e.target.value)}
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
            </div>

            {/* Payout wallet */}
            <div>
              <label htmlFor="settings-payout-wallet" className={labelClass}>
                Payout_Wallet_Address
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-payout-wallet"
                  type="text"
                  value={values.payoutWalletAddress}
                  onChange={(e) => set("payoutWalletAddress", e.target.value)}
                  placeholder="0x..."
                  autoComplete="off"
                  className={`${inputClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(values.payoutWalletAddress)
                  }
                  className="border border-[#3d4a3d] px-3 rounded text-[#bccbb9] hover:text-[#dce5d9] hover:bg-[#242c24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
                  title="Copy address"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>
            </div>

            {/* Payout threshold */}
            <div>
              <label htmlFor="settings-payout-threshold" className={labelClass}>
                Min_Payout_Threshold
              </label>
              <input
                id="settings-payout-threshold"
                type="text"
                inputMode="decimal"
                value={values.payoutThresholdUsdc}
                onChange={(e) => set("payoutThresholdUsdc", e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 font-mono text-[10px] text-[#869585]">
                Minimum profit before sweep
              </p>
            </div>

            {/* Auto payout toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-wider mb-0.5">
                  Payout_Auto_Enabled
                </div>
                <div className="font-mono text-[10px] text-[#869585]">
                  Automatic profit sweeps
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={values.isPayoutEnabled}
                  onChange={(e) => set("isPayoutEnabled", e.target.checked)}
                />
                <div className="w-11 h-6 bg-[#2f372e] peer-checked:bg-[#4be277] rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#bccbb9] after:border-[#2f372e] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:bg-[#003915]" />
              </label>
            </div>

            {/* Feedback */}
            <div className="min-h-4" aria-live="polite" aria-atomic="true">
              {error && <p className="font-mono text-xs text-[#ffb4ab]">{error}</p>}
              {saved && !error && <p className="font-mono text-xs text-[#4be277]">Settings saved.</p>}
            </div>

            {/* Save button */}
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="w-full bg-[#22c55e] text-[#004b1e] py-3 font-mono font-semibold text-sm rounded hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277] disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-base">
                {saving ? "progress_activity" : saved ? "check_circle" : "save"}
              </span>
              {saving ? "Saving..." : saved ? "Saved" : "Save Changes"}
            </button>

            <p className="font-mono text-[10px] text-[#869585] text-center">
              System integrity: 100% | Latency: 4ms
            </p>
          </form>
        </section>
      </div>

      {/* Right: System status — 5 cols */}
      <div className="lg:col-span-5 grid grid-cols-1 gap-4">
        {/* Core_Logs card */}
        <div className="bg-[#1a221a] border border-[#3d4a3d] p-4 rounded">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[16px] font-semibold text-[#4be277] uppercase tracking-tight">
              Core_Logs
            </h3>
            <span className="bg-[#005321] text-[#6bff8f] font-mono text-[10px] px-2 py-0.5 rounded">
              LIVE
            </span>
          </div>
          <div className="font-mono text-[12px] space-y-2 opacity-80">
            <div className="text-[#bccbb9]">
              <span className="text-[#4be277]">[04:00]</span> Cycle initiated
            </div>
            <div className="text-[#bccbb9]">
              <span className="text-[#4be277]">[04:01]</span> Niche scored: 0.87
            </div>
            <div className="text-[#bccbb9]">
              <span className="text-[#adc6ff]">[04:03]</span> Content generated
            </div>
            <div className="text-[#bccbb9]">
              <span className="text-[#ffba61]">[04:05]</span> Product deployed
            </div>
            <div className="text-[#bccbb9]">
              <span className="text-[#4be277]">[04:06]</span> Awaiting revenue...
            </div>
          </div>
        </div>

        {/* Traffic_Map card */}
        <div className="bg-[#1a221a] border border-[#3d4a3d] p-4 rounded relative overflow-hidden h-64">
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(#22c55e 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
          <h3 className="text-[16px] font-semibold text-[#dce5d9] uppercase tracking-tight mb-4 relative z-10">
            Traffic_Map
          </h3>
          <div className="grid grid-cols-3 gap-2 relative z-10">
            <div className="bg-[#161d16] border border-[#3d4a3d] p-2 text-center">
              <div className="font-mono text-[10px] text-[#869585] uppercase mb-1">CPU</div>
              <div className="font-mono text-[16px] font-bold text-[#4be277]">12%</div>
            </div>
            <div className="bg-[#161d16] border border-[#3d4a3d] p-2 text-center">
              <div className="font-mono text-[10px] text-[#869585] uppercase mb-1">MEM</div>
              <div className="font-mono text-[16px] font-bold text-[#adc6ff]">38%</div>
            </div>
            <div className="bg-[#161d16] border border-[#3d4a3d] p-2 text-center">
              <div className="font-mono text-[10px] text-[#869585] uppercase mb-1">OPS</div>
              <div className="font-mono text-[16px] font-bold text-[#ffba61]">4/h</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
