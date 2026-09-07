import { RiskBadge } from "./RiskBadge";
import type { RiskTask } from "../../types/risk";

export function RiskTable({
  tasks,
  selectedId,
  onSelect,
}: {
  tasks: RiskTask[];
  selectedId: string;
  onSelect: (assetId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">Asset ID</th>
              <th className="px-3 py-2.5 font-medium">Task</th>
              <th className="px-3 py-2.5 font-medium">Department</th>
              <th className="px-3 py-2.5 font-medium">Section</th>
              <th className="px-3 py-2.5 font-medium">Risk Score</th>
              <th className="px-3 py-2.5 font-medium">Priority</th>
              <th className="px-3 py-2.5 font-medium">Overdue Days</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const isSelected = task.assetId === selectedId;

              return (
                <tr
                  key={task.assetId}
                  onClick={() => onSelect(task.assetId)}
                  className={[
                    "cursor-pointer border-t border-slate-200 transition-colors",
                    isSelected ? "bg-blue-50/60" : "bg-white hover:bg-slate-50",
                  ].join(" ")}
                >
                  <td className="px-3 py-2.5 font-semibold text-slate-800">
                    {task.assetId}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{task.task}</td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {task.department}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{task.section}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="min-w-10 text-right font-semibold text-slate-800">
                        {task.riskScore}%
                      </span>
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={[
                            "h-full rounded-full",
                            task.riskScore >= 80
                              ? "bg-red-500"
                              : task.riskScore >= 70
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          ].join(" ")}
                          style={{ width: `${task.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <RiskBadge priority={task.priority} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {task.overdueDays}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold",
                        task.status === "Attention Required"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : task.status === "Monitor"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
