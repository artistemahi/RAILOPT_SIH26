import type { RiskFactor } from "../../types/risk";

export function RiskFactors({ factors }: { factors: RiskFactor[] }) {
  return (
    <div className="space-y-3">
      {factors.map((factor) => (
        <div key={factor.label} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>{factor.label}</span>
            <span className="font-medium text-slate-700">{factor.value}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full"
              style={{
                width: `${factor.value}%`,
                backgroundColor: factor.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
