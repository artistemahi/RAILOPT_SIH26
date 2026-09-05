import type { ConstraintStatus } from "../../services/mock/blockPlannerData";

const stateStyles = {
  OK: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Warning: "border-amber-200 bg-amber-50 text-amber-700",
  Conflict: "border-red-200 bg-red-50 text-red-700",
};

export function ConstraintsSummary({
  constraints,
}: {
  constraints: ConstraintStatus[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-[12px] font-semibold text-slate-800">
        Constraints Summary
      </div>

      <div className="space-y-2">
        {constraints.map((constraint) => (
          <div
            key={constraint.name}
            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-2 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={[
                  "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold",
                  constraint.state === "OK"
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : constraint.state === "Warning"
                      ? "border-amber-200 bg-amber-100 text-amber-700"
                      : "border-red-200 bg-red-100 text-red-700",
                ].join(" ")}
              >
                {constraint.state === "OK"
                  ? "✓"
                  : constraint.state === "Warning"
                    ? "!"
                    : "⚠"}
              </span>
              <span className="text-[11px] text-slate-700">
                {constraint.name}
              </span>
            </div>

            <span
              className={[
                "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                stateStyles[constraint.state],
              ].join(" ")}
            >
              {constraint.value}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
      >
        View All Constraints
      </button>
    </div>
  );
}
