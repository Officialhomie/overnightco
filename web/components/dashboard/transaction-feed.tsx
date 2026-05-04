import type { Transaction } from "@/lib/db/schema";

interface TransactionFeedProps {
  transactions: Transaction[];
}

const TX_STYLES: Record<string, { color: string; sign: string }> = {
  REVENUE_HUMAN: { color: "text-[#22c55e]", sign: "+" },
  REVENUE_AGENT: { color: "text-[#22c55e]", sign: "+" },
  COST_EXA: { color: "text-[#ef4444]", sign: "-" },
  COST_CLAUDE: { color: "text-[#ef4444]", sign: "-" },
  COST_STABILITY: { color: "text-[#ef4444]", sign: "-" },
  COST_BUILD: { color: "text-[#ef4444]", sign: "-" },
  COST_OTHER: { color: "text-[#ef4444]", sign: "-" },
  PAYOUT: { color: "text-[#a855f7]", sign: "-" },
};

export function TransactionFeed({ transactions }: TransactionFeedProps) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
        Transaction feed
      </h2>
      <div className="space-y-1">
        {transactions.length === 0 ? (
          <p className="text-sm text-[#52525b]">No transactions yet.</p>
        ) : (
          transactions.map((tx) => {
            const style = TX_STYLES[tx.type] ?? { color: "text-[#a1a1aa]", sign: "" };
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded px-3 py-2 text-sm hover:bg-[#111111]"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[#a1a1aa]">
                    {tx.description}
                  </span>
                  <span className="text-xs text-[#52525b]">
                    {tx.type} · {new Date(tx.occurredAt).toLocaleTimeString()}
                  </span>
                </div>
                <span className={`ml-4 font-mono font-semibold ${style.color}`}>
                  {style.sign}${tx.amountUsdc}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
