import type { PendingTask } from "../../services/mock/blockPlannerData";

const priorityStyles = {
  P2: "bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200",
  P3: "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

export function PendingTasksTable({ tasks }: { tasks: PendingTask[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-3 text-[12px] font-semibold text-slate-800">
        Unscheduled / Pending Tasks
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-[11px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-2 py-2 font-medium">Asset ID</th>
              <th className="px-2 py-2 font-medium">Task</th>
              <th className="px-2 py-2 font-medium">Department</th>
              <th className="px-2 py-2 font-medium">Section</th>
              <th className="px-2 py-2 font-medium">Risk Score</th>
              <th className="px-2 py-2 font-medium">Priority</th>
              <th className="px-2 py-2 font-medium">Reason</th>
              <th className="px-2 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr
                key={task.assetId}
                className="border-t border-slate-200 text-slate-700"
              >
                <td className="px-2 py-2 font-medium text-slate-800">
                  {task.assetId}
                </td>
                <td className="px-2 py-2">{task.task}</td>
                <td className="px-2 py-2">{task.department}</td>
                <td className="px-2 py-2">{task.section}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {task.riskScore}%
                    </span>
                    <div className="h-2 w-12 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={[
                          "h-full rounded-full",
                          task.riskScore >= 60
                            ? "bg-amber-400"
                            : "bg-emerald-400",
                        ].join(" ")}
                        style={{ width: `${task.riskScore}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <span
                    className={`inline-flex min-w-[2.25rem] items-center justify-center rounded px-2 py-0.5 text-[10px] font-semibold ${priorityStyles[task.priority]}`}
                  >
                    {task.priority}
                  </span>
                </td>
                <td className="px-2 py-2">{task.reason}</td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                  >
                    Force Schedule
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
