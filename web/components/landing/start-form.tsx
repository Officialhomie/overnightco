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
        className="mx-auto max-w-lg rounded-lg border border-[#22c55e]/30 bg-[#052e16]/40 p-6 text-left"
        role="status"
        aria-live="polite"
      >
        <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#22c55e]">
          Product live
        </div>
        <div className="mb-2 text-lg font-bold">{result.selectedNiche}</div>
        <p className="mb-4 text-sm text-[#a1a1aa]">{result.reason}</p>
        <div className="mb-4 text-xs text-[#71717a]">
          Build cost: ${result.totalCostUsdc} USDC
        </div>
        <a
          href={result.productUrl}
          className="block min-h-11 rounded border border-[#22c55e] bg-[#22c55e] px-4 py-2.5 text-center text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
        >
          View product
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl" noValidate>
      <div className="overflow-hidden rounded-xl border border-[#27272a] bg-[#111111]">
        <div className="flex flex-col sm:flex-row sm:divide-x sm:divide-[#27272a]">
          <div className="min-w-0 flex-1 px-4 py-3">
            <label htmlFor="start-form-category" className="mb-1 block text-left text-xs text-[#52525b]">
              Niche or category
            </label>
            <input
              id="start-form-category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder='e.g. "Base ecosystem analytics"'
              disabled={loading}
              autoComplete="off"
              className="w-full bg-transparent text-sm text-[#ededed] placeholder-[#3f3f46] outline-none disabled:opacity-50"
            />
          </div>
          <div className="shrink-0 border-t border-[#27272a] px-4 py-3 sm:w-36 sm:border-t-0">
            <label htmlFor="start-form-deposit" className="mb-1 block text-left text-xs text-[#52525b]">
              Deposit (USDC)
            </label>
            <input
              id="start-form-deposit"
              type="text"
              inputMode="decimal"
              value={deposit}
              onChange={(e) => setDeposit(e.target.value)}
              placeholder="20.00"
              disabled={loading}
              autoComplete="off"
              className="w-full bg-transparent text-sm text-[#ededed] outline-none sm:text-right disabled:opacity-50"
            />
          </div>
        </div>
        <div className="border-t border-[#27272a]">
          <button
            type="submit"
            disabled={loading || !category.trim()}
            aria-busy={loading}
            className="min-h-12 w-full bg-[#22c55e] px-6 py-3 text-sm font-semibold text-[#052e16] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22c55e] focus-visible:ring-inset disabled:opacity-40"
          >
            {loading ? "AI is working..." : "Give the AI $20"}
          </button>
        </div>
      </div>
      <div className="mt-3 min-h-5" aria-live="polite" aria-atomic="true">
        {loading && (
          <p className="text-xs text-[#52525b]">
            Scoring niches, researching, and writing your product. Takes ~30 seconds.
          </p>
        )}
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    </form>
  );
}
