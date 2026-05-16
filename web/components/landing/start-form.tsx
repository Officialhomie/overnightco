"use client";

import { useState } from "react";

export function StartForm() {
  const [category, setCategory] = useState("");
  const [deposit, setDeposit] = useState("20.00");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    productUrl: string;
    selectedNiche: string;
    reason: string;
    totalCostUsdc: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category.trim(),
          depositAmountUsdc: deposit,
        }),
      });

      const data = await res.json() as Record<string, unknown>;

      if (!res.ok) {
        setError((data.error as string) ?? "Something went wrong");
        return;
      }

      setResult({
        productUrl: data.productUrl as string,
        selectedNiche: data.selectedNiche as string,
        reason: data.reason as string,
        totalCostUsdc: data.totalCostUsdc as string,
      });
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div
        className="mx-auto max-w-lg border border-[#4be277]/30 bg-[#003915]/40 p-6 text-left"
        role="status"
        aria-live="polite"
      >
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#4be277]">
          Product live
        </div>
        <div className="mb-2 text-lg font-bold text-[#dce5d9]">{result.selectedNiche}</div>
        <p className="mb-4 text-sm text-[#bccbb9]">{result.reason}</p>
        <div className="mb-4 text-xs text-[#869585]">
          Build cost: ${result.totalCostUsdc} USDC
        </div>
        <a
          href={result.productUrl}
          className="block w-full bg-[#4be277] px-4 py-3 text-center text-sm font-semibold text-[#003915] hover:brightness-110 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277]"
        >
          View product
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl" noValidate>
      <div className="border border-[#3d4a3d] bg-[#161d16] overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 p-6 md:p-8">
          {/* Niche input */}
          <div className="flex-1">
            <label
              htmlFor="start-form-category"
              className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#bccbb9]"
            >
              Enter niche
            </label>
            <input
              id="start-form-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder='e.g. "Base ecosystem analytics"'
              disabled={loading}
              autoComplete="off"
              className="w-full bg-[#0e150e] border border-[#3d4a3d] p-4 text-sm text-[#dce5d9] placeholder-[#869585]/50 outline-none focus:ring-1 focus:ring-[#4be277] disabled:opacity-50"
            />
          </div>
          {/* Deposit input */}
          <div className="md:w-1/3">
            <label
              htmlFor="start-form-deposit"
              className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#bccbb9]"
            >
              Deposit (USDC)
            </label>
            <div className="relative">
              <input
                id="start-form-deposit"
                type="text"
                inputMode="decimal"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="20.00"
                disabled={loading}
                autoComplete="off"
                className="w-full bg-[#0e150e] border border-[#3d4a3d] p-4 text-sm text-[#dce5d9] outline-none focus:ring-1 focus:ring-[#4be277] disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#adc6ff] font-mono pointer-events-none">
                USDC
              </span>
            </div>
          </div>
        </div>

        {/* CTA button */}
        <div className="px-6 md:px-8 pb-8">
          <button
            type="submit"
            disabled={loading || !category.trim()}
            aria-busy={loading}
            className="w-full bg-[#4be277] text-[#003915] py-4 text-sm font-semibold hover:brightness-110 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4be277] focus-visible:ring-inset disabled:opacity-40 flex items-center justify-center gap-3"
          >
            {!loading && (
              <span className="material-symbols-outlined text-lg">bolt</span>
            )}
            {loading ? "AI is working..." : "Give the AI $20"}
          </button>
          <p className="mt-4 text-[10px] text-[#869585] text-center font-mono">
            {loading
              ? "Scoring niches, researching, and writing your product. Takes ~30 seconds."
              : "Protocol ensures automated deployment within 240 seconds."}
          </p>
        </div>
      </div>

      <div className="mt-3 min-h-5" aria-live="polite" aria-atomic="true">
        {error && <p className="text-xs text-[#ffb4ab]">{error}</p>}
      </div>
    </form>
  );
}
