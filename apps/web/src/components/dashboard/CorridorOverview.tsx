import type { CorridorStatus } from "../../types/dashboard";

const stateStyles: Record<CorridorStatus["state"], string> = {
  Normal: "bg-emerald-500",
  Busy: "bg-amber-500",
  Blocked: "bg-rose-500",
  Selected: "bg-blue-500",
};

export function CorridorOverview({
  corridorStatus,
}: {
  corridorStatus: CorridorStatus[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <h2 className="mb-3 text-[14px] font-semibold text-slate-800">
        Corridor Overview
      </h2>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          {corridorStatus.map((segment) => (
            <div
              key={segment.name}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex w-full items-center justify-center">
                {segment.name !== corridorStatus[0].name ? (
                  <span className="h-0.5 flex-1 bg-slate-300" />
                ) : (
                  <span className="w-2" />
                )}
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full border-2 border-white ${stateStyles[segment.state]}`}
                />
                {segment.name !==
                corridorStatus[corridorStatus.length - 1].name ? (
                  <span className="h-0.5 flex-1 bg-slate-300" />
                ) : null}
              </div>
              <span className="text-[10px] font-medium text-slate-600">
                {segment.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Busy
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Blocked
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Selected
        </div>
      </div>
    </div>
  );
}
