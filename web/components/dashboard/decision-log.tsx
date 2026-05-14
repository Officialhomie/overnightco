import type { AiDecision } from "@/lib/db/schema";

interface DecisionLogProps {
  decisions: AiDecision[];
}

const PHASE_COLORS: Record<string, string> = {
  DECIDE: "text-[#22c55e] border-[#22c55e]/30",
  BUILD: "text-[#3b82f6] border-[#3b82f6]/30",
  REPORT: "text-[#a855f7] border-[#a855f7]/30",
};

export function DecisionLog({ decisions }: DecisionLogProps) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#71717a]">
        AI decision log
      </h2>
      <div className="space-y-3">
        {decisions.length === 0 ? (
          <p className="text-sm text-[#52525b]">No decisions yet.</p>
        ) : (
          decisions.map((d) => (
            <div
              key={d.id}
              className="rounded-lg border border-[#27272a] bg-[#111111] p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-xs font-semibold ${PHASE_COLORS[d.phase] ?? "text-[#a1a1aa] border-[#27272a]"}`}
                >
                  {d.phase}
                </span>
                <span className="shrink-0 text-xs text-[#52525b]">
                  {new Date(d.createdAt).toLocaleTimeString()}
                </span>
                {d.costUsdc && (
                  <span className="text-xs text-[#ef4444] sm:ml-auto">
                    ${d.costUsdc}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-[#a1a1aa]">{d.decision}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
