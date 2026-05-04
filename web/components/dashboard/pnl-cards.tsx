import type { PnlResult } from "@/lib/pnl/calculator";

interface PnlCardsProps {
  today: PnlResult;
  allTime: PnlResult;
}

function Card({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-[#27272a] bg-[#111111] p-5">
      <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#71717a]">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color ?? "text-[#ededed]"}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-[#71717a]">{sub}</div>}
    </div>
  );
}

export function PnlCards({ today, allTime }: PnlCardsProps) {
  const todayProfit = parseFloat(today.profitUsdc);
  const allTimeProfit = parseFloat(allTime.profitUsdc);

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#71717a]">
        Today
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <Card
          label="Revenue"
          value={`$${today.revenueUsdc}`}
          sub={`human $${today.revenueByType.human} · agent $${today.revenueByType.agent}`}
          color="text-[#22c55e]"
        />
        <Card
          label="Costs"
          value={`$${today.costsUsdc}`}
          sub={`exa $${today.costsByType.exa} · claude $${today.costsByType.claude}`}
          color="text-[#ef4444]"
        />
        <Card
          label="Profit"
          value={`$${today.profitUsdc}`}
          sub={`${today.transactionCount} transactions`}
          color={todayProfit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}
        />
      </div>

      <h2 className="mt-6 text-xs font-semibold uppercase tracking-widest text-[#71717a]">
        All time
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <Card
          label="Revenue"
          value={`$${allTime.revenueUsdc}`}
          sub={`human $${allTime.revenueByType.human} · agent $${allTime.revenueByType.agent}`}
          color="text-[#22c55e]"
        />
        <Card
          label="Costs"
          value={`$${allTime.costsUsdc}`}
          sub={`exa $${allTime.costsByType.exa} · claude $${allTime.costsByType.claude}`}
          color="text-[#ef4444]"
        />
        <Card
          label="Profit"
          value={`$${allTime.profitUsdc}`}
          color={allTimeProfit >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}
        />
      </div>
    </div>
  );
}
