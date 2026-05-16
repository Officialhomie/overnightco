import type { PnlResult } from "@/lib/pnl/calculator";

interface PnlCardsProps {
  today: PnlResult;
  allTime: PnlResult;
}

export function PnlCards({ today, allTime }: PnlCardsProps) {
  const todayProfit = parseFloat(today.profitUsdc);
  const allTimeProfit = parseFloat(allTime.profitUsdc);

  const todayRevenue = parseFloat(today.revenueUsdc);
  const todayCosts = parseFloat(today.costsUsdc);
  const todayMargin =
    todayRevenue > 0 ? Math.round((todayProfit / todayRevenue) * 100) : 0;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-[#bccbb9] text-base">query_stats</span>
        <span className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-widest">
          Performance Snapshot
        </span>
      </div>

      {/* Today row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-[#1a221a] border border-[#3d4a3d] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">Today: Revenue</div>
          <div className="text-[24px] font-bold text-[#4be277]">${today.revenueUsdc}</div>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-[#4be277] text-sm">trending_up</span>
            <span className="font-mono text-[10px] text-[#4be277]">
              human ${today.revenueByType.human} · agent ${today.revenueByType.agent}
            </span>
          </div>
        </div>

        <div className="bg-[#1a221a] border border-[#3d4a3d] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">Today: Costs</div>
          <div className="text-[24px] font-bold text-[#ffb4ab]">${today.costsUsdc}</div>
          <div className="font-mono text-[10px] text-[#bccbb9] mt-1">
            exa ${today.costsByType.exa} · claude ${today.costsByType.claude}
          </div>
        </div>

        <div className="bg-[#1a221a] border border-[#3d4a3d] border-l-4 border-l-[#4be277] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">Today: Net Profit</div>
          <div
            className={`text-[24px] font-bold ${
              todayProfit >= 0 ? "text-[#4ae176]" : "text-[#ffb4ab]"
            }`}
          >
            ${today.profitUsdc}
          </div>
          <div className="font-mono text-[10px] text-[#bccbb9] mt-1">
            Margin: {todayMargin}%
          </div>
        </div>
      </div>

      {/* All time row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 opacity-80">
        <div className="bg-[#161d16] border border-[#3d4a3d] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">All Time: Revenue</div>
          <div className="text-[20px] font-bold text-[#dce5d9]">${allTime.revenueUsdc}</div>
          <div className="font-mono text-[10px] text-[#bccbb9] mt-1">
            human ${allTime.revenueByType.human} · agent ${allTime.revenueByType.agent}
          </div>
        </div>

        <div className="bg-[#161d16] border border-[#3d4a3d] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">All Time: Costs</div>
          <div className="text-[20px] font-bold text-[#bccbb9]">${allTime.costsUsdc}</div>
          <div className="font-mono text-[10px] text-[#bccbb9] mt-1">
            exa ${allTime.costsByType.exa} · claude ${allTime.costsByType.claude}
          </div>
        </div>

        <div className="bg-[#161d16] border border-[#3d4a3d] p-4">
          <div className="font-mono text-[10px] text-[#bccbb9] uppercase mb-2">All Time: Net Profit</div>
          <div
            className={`text-[20px] font-bold ${
              allTimeProfit >= 0 ? "text-[#4be277]" : "text-[#ffb4ab]"
            }`}
          >
            ${allTime.profitUsdc}
          </div>
          <div className="font-mono text-[10px] text-[#bccbb9] mt-1">
            {allTime.transactionCount} transactions
          </div>
        </div>
      </div>
    </div>
  );
}
