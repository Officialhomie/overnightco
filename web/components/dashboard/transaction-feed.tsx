import type { Transaction } from "@/lib/db/schema";

interface TransactionFeedProps {
  transactions: Transaction[];
}

function typeLabel(type: string): { label: string; color: string } {
  if (type === "REVENUE_HUMAN" || type === "REVENUE_AGENT") {
    return { label: "SALE", color: "text-[#adc6ff]" };
  }
  if (type.startsWith("COST_")) {
    return { label: "BURN", color: "text-[#ffb4ab]" };
  }
  if (type === "PAYOUT") {
    return { label: "ADMIN", color: "text-[#bccbb9]" };
  }
  return { label: type, color: "text-[#869585]" };
}

function amountStyle(type: string): { color: string; sign: string } {
  if (type === "REVENUE_HUMAN" || type === "REVENUE_AGENT") {
    return { color: "text-[#4be277]", sign: "+" };
  }
  if (type.startsWith("COST_") || type === "PAYOUT") {
    return { color: "text-[#ffb4ab]", sign: "-" };
  }
  return { color: "text-[#bccbb9]", sign: "" };
}

export function TransactionFeed({ transactions }: TransactionFeedProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#ffba61] text-base">receipt_long</span>
          <span className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-widest">
            Transaction Feed
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#869585]">Latest 50</span>
      </div>

      <div className="bg-[#1a221a] border border-[#3d4a3d] overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-6 text-center font-mono text-sm text-[#869585]">
            No transactions yet.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#242c24] border-b border-[#3d4a3d]">
              <tr>
                <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-left">
                  Description
                </th>
                <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-left">
                  Type
                </th>
                <th className="font-mono text-[10px] text-[#bccbb9] uppercase px-4 py-2 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d4a3d]">
              {transactions.map((tx) => {
                const badge = typeLabel(tx.type);
                const amount = amountStyle(tx.type);
                return (
                  <tr key={tx.id} className="hover:bg-[#2f372e] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[12px] text-[#dce5d9] truncate max-w-[200px]">
                        {tx.description}
                      </div>
                      <div className="font-mono text-[10px] text-[#869585]">
                        {new Date(tx.occurredAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-[10px] uppercase ${badge.color}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono text-[12px] font-semibold ${amount.color}`}>
                        {amount.sign}${tx.amountUsdc}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
