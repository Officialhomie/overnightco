import type { AiDecision } from "@/lib/db/schema";

interface DecisionLogProps {
  decisions: AiDecision[];
}

function phaseBadgeClass(phase: string): string {
  switch (phase) {
    case "DECIDE":
      return "bg-blue-900/30 text-blue-400";
    case "BUILD":
      return "bg-green-900/30 text-green-400";
    case "REPORT":
      return "bg-amber-900/30 text-amber-400";
    default:
      return "bg-[#2f372e] text-[#bccbb9]";
  }
}

export function DecisionLog({ decisions }: DecisionLogProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#adc6ff] text-base">psychology</span>
          <span className="font-mono text-[10px] text-[#bccbb9] uppercase tracking-widest">
            AI Decision Log
          </span>
        </div>
        <span className="font-mono text-[10px] text-[#869585]">Real-time Feed</span>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {decisions.length === 0 ? (
          <p className="font-mono text-sm text-[#869585]">No decisions yet.</p>
        ) : (
          decisions.map((d) => (
            <div
              key={d.id}
              className={`bg-[#1a221a] border border-[#3d4a3d] p-4 ${
                d.phase === "BUILD" ? "border-l-4 border-l-[#4be277]" : ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
                <span
                  className={`shrink-0 px-2 py-0.5 rounded font-mono text-[10px] uppercase ${phaseBadgeClass(d.phase)}`}
                >
                  {d.phase}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[#869585]">
                  {new Date(d.createdAt).toLocaleTimeString()}
                </span>
                {d.costUsdc && (
                  <span className="font-mono text-[10px] text-[#ffb4ab] sm:ml-auto">
                    ${d.costUsdc}
                  </span>
                )}
              </div>
              <p className="font-mono text-[12px] text-[#dce5d9] leading-relaxed">{d.decision}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
