import type { MaintenanceTask } from "../../types/dashboard";
import { RiskBadge } from "./RiskBadge";

export function RiskTable({ tasks }: { tasks: MaintenanceTask[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
        <h2 className="text-[14px] font-semibold text-slate-800">
          High Priority Maintenance Tasks
        </h2>
        <button
          type="button"
          className="text-[11px] font-medium text-blue-700 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Asset ID</th>
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Department</th>
              <th className="px-3 py-2 font-medium">Priority</th>
              <th className="px-3 py-2 font-medium">Risk Score</th>
              <th className="px-3 py-2 font-medium">Overdue Days</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.assetId}
                className="border-t border-slate-200 text-slate-700"
              >
                <td className="px-3 py-2 font-medium text-slate-800">
                  {task.assetId}
                </td>
                <td className="px-3 py-2">{task.task}</td>
                <td className="px-3 py-2">{task.department}</td>
                <td className="px-3 py-2">
                  <RiskBadge priority={task.priority} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="min-w-10 text-right font-semibold text-slate-800">
                      {task.riskScore}%
                    </span>
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={[
                          "h-full rounded-full",
                          task.riskScore >= 80
                            ? "bg-rose-500"
                            : task.riskScore >= 70
                              ? "bg-amber-500"
                              : "bg-emerald-500",
                        ].join(" ")}
                        style={{ width: `${task.riskScore}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-slate-700">
                  {task.overdueDays}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
