import { useEffect, useMemo, useState } from "react";
import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { Sidebar } from "../components/dashboard/Sidebar";
import { getWhatIfOptions, runWhatIf } from "../services/whatIfService";
import type {
  WhatIfChange,
  WhatIfChangeType,
  WhatIfOptions,
  WhatIfResult,
  WhatIfSlot,
} from "../types/whatIf";

const changeLabels: Record<WhatIfChangeType, string> = {
  WINDOW_UNAVAILABLE: "Close a block window",
  WINDOW_SHORTEN: "Shorten a block window",
  RESOURCE_UNAVAILABLE: "Make a resource unavailable",
  TASK_DURATION: "Task takes longer",
  TASK_PRIORITY: "Change a task's priority",
  TASK_REMOVE: "Remove a task",
  TRAIN_ADD: "Add a train movement",
};

const fieldClass =
  "rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

function formatWindow(window: WhatIfOptions["windows"][number]): string {
  const start = window.start_time.slice(5, 16).replace(" ", " ");
  return `${window.window_id} · ${window.sections.join("+")} · ${start}–${window.end_time.slice(11, 16)} · ${window.block_type.replace("_BLOCK", "")}`;
}

function formatSlot(slot: WhatIfSlot): string {
  return `${slot.window_id} · ${slot.start.slice(5)}–${slot.end.slice(11)}`;
}

function describe(change: WhatIfChange): string {
  switch (change.type) {
    case "WINDOW_UNAVAILABLE":
      return `Close ${change.window_id}`;
    case "WINDOW_SHORTEN":
      return `Shorten ${change.window_id} by ${change.minutes} min`;
    case "RESOURCE_UNAVAILABLE":
      return `${change.resource_id} unavailable`;
    case "TASK_DURATION":
      return `${change.task_id} +${change.minutes} min`;
    case "TASK_PRIORITY":
      return `${change.task_id} priority → ${change.priority_score}`;
    case "TASK_REMOVE":
      return `Remove ${change.task_id}`;
    case "TRAIN_ADD":
      return `Train on ${change.section_id} ${change.start_time?.slice(5, 16)}–${change.end_time?.slice(11, 16)}`;
  }
}

function toApiTime(local: string): string {
  // <input type="datetime-local"> gives "YYYY-MM-DDTHH:MM"
  return `${local.replace("T", " ")}:00`;
}

export default function WhatIfPage() {
  const [options, setOptions] = useState<WhatIfOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [type, setType] = useState<WhatIfChangeType>("WINDOW_UNAVAILABLE");
  const [draft, setDraft] = useState<Partial<WhatIfChange>>({});
  const [changes, setChanges] = useState<WhatIfChange[]>([]);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getWhatIfOptions()
      .then(setOptions)
      .catch(() => setLoadError("What-if data is unavailable. Check the API connection."));
  }, []);

  const availableWindows = useMemo(
    () => options?.windows.filter((window) => window.available) ?? [],
    [options],
  );
  const tasksByPriority = useMemo(
    () => [...(options?.tasks ?? [])].sort((a, b) => b.priority_score - a.priority_score),
    [options],
  );

  const draftChange = { ...draft, type } as WhatIfChange;
  const draftReady = (() => {
    switch (type) {
      case "WINDOW_UNAVAILABLE":
        return Boolean(draft.window_id);
      case "WINDOW_SHORTEN":
        return Boolean(draft.window_id && draft.minutes && draft.minutes > 0);
      case "RESOURCE_UNAVAILABLE":
        return Boolean(draft.resource_id);
      case "TASK_DURATION":
        return Boolean(draft.task_id && draft.minutes && draft.minutes > 0);
      case "TASK_PRIORITY":
        return Boolean(draft.task_id && draft.priority_score !== undefined);
      case "TASK_REMOVE":
        return Boolean(draft.task_id);
      case "TRAIN_ADD":
        return Boolean(draft.section_id && draft.start_time && draft.end_time);
    }
  })();

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      setResult(await runWhatIf(changes));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "What-if simulation failed");
    } finally {
      setRunning(false);
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-sm text-slate-600">
        {loadError}
      </div>
    );
  }

  if (!options) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading what-if data...
      </div>
    );
  }

  const windowSelect = (
    <select
      className={fieldClass}
      value={draft.window_id ?? ""}
      onChange={(event) => setDraft({ ...draft, window_id: event.target.value })}
    >
      <option value="">Select window…</option>
      {availableWindows.map((window) => (
        <option key={window.window_id} value={window.window_id}>
          {formatWindow(window)}
        </option>
      ))}
    </select>
  );
  const taskSelect = (
    <select
      className={fieldClass}
      value={draft.task_id ?? ""}
      onChange={(event) => setDraft({ ...draft, task_id: event.target.value })}
    >
      <option value="">Select pending task…</option>
      {tasksByPriority.map((task) => (
        <option key={task.task_id} value={task.task_id}>
          {task.task_id} · {task.department} · {task.section_id} · priority {task.priority_score}
        </option>
      ))}
    </select>
  );
  const minutesInput = (
    <input
      type="number"
      min={1}
      placeholder="minutes"
      className={`${fieldClass} w-28`}
      value={draft.minutes ?? ""}
      onChange={(event) => setDraft({ ...draft, minutes: Number(event.target.value) || undefined })}
    />
  );
  const horizonStart = `${options.planning_date}T00:00`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />

      <div className="ml-52 min-h-screen bg-slate-100">
        <DashboardHeader
          title="What-if Simulation"
          subtitle="Change planning conditions and compare the CP-SAT plan before committing."
        />

        <main className="space-y-4 p-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
              Scenario
            </p>
            <p className="mt-1 max-w-3xl text-xs text-slate-600">
              The current plan (baseline) and the changed scenario are solved with
              the same inputs and priorities, deterministically, so every
              difference below comes from the changes. The scenario keeps tasks in
              their baseline window where possible. This is scenario analysis, not
              a forecast.
            </p>

            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                Change
                <select
                  className={fieldClass}
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as WhatIfChangeType);
                    setDraft({});
                  }}
                >
                  {Object.entries(changeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {(type === "WINDOW_UNAVAILABLE" || type === "WINDOW_SHORTEN") && windowSelect}
              {type === "WINDOW_SHORTEN" && minutesInput}
              {type === "RESOURCE_UNAVAILABLE" && (
                <select
                  className={fieldClass}
                  value={draft.resource_id ?? ""}
                  onChange={(event) => setDraft({ ...draft, resource_id: event.target.value })}
                >
                  <option value="">Select resource…</option>
                  {options.resources
                    .filter((resource) => resource.status === "AVAILABLE")
                    .map((resource) => (
                      <option key={resource.resource_id} value={resource.resource_id}>
                        {resource.resource_id} · {resource.department} · {resource.skills}
                      </option>
                    ))}
                </select>
              )}
              {(type === "TASK_DURATION" || type === "TASK_PRIORITY" || type === "TASK_REMOVE") &&
                taskSelect}
              {type === "TASK_DURATION" && minutesInput}
              {type === "TASK_PRIORITY" && (
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="new priority 0–100"
                  className={`${fieldClass} w-40`}
                  value={draft.priority_score ?? ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      priority_score: event.target.value === "" ? undefined : Number(event.target.value),
                    })
                  }
                />
              )}
              {type === "TRAIN_ADD" && (
                <>
                  <select
                    className={fieldClass}
                    value={draft.section_id ?? ""}
                    onChange={(event) => setDraft({ ...draft, section_id: event.target.value })}
                  >
                    <option value="">Section…</option>
                    {options.sections.map((section) => (
                      <option key={section}>{section}</option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    min={horizonStart}
                    onChange={(event) =>
                      setDraft({ ...draft, start_time: event.target.value && toApiTime(event.target.value) })
                    }
                  />
                  <input
                    type="datetime-local"
                    className={fieldClass}
                    min={horizonStart}
                    onChange={(event) =>
                      setDraft({ ...draft, end_time: event.target.value && toApiTime(event.target.value) })
                    }
                  />
                </>
              )}

              <button
                type="button"
                disabled={!draftReady}
                onClick={() => {
                  setChanges([...changes, draftChange]);
                  setDraft({});
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add change
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {changes.length ? (
                changes.map((change, index) => (
                  <span
                    key={`${describe(change)}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-800"
                  >
                    {describe(change)}
                    <button
                      type="button"
                      aria-label="Remove change"
                      className="text-blue-500 hover:text-blue-800"
                      onClick={() => setChanges(changes.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-500">
                  No changes yet: running now compares the plan with itself.
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleRun()}
                disabled={running}
                className="ml-auto rounded-md bg-blue-700 px-3 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-800 disabled:opacity-60"
              >
                {running ? "Simulating..." : "Run simulation"}
              </button>
            </div>

            {error ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
                {error}
              </div>
            ) : null}
          </section>

          {result ? <WhatIfResults result={result} /> : null}
        </main>
      </div>
    </div>
  );
}

function Delta({ before, after, unit = "" }: { before: number; after: number; unit?: string }) {
  const delta = Math.round((after - before) * 10) / 10;
  const tone = delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-400";
  return (
    <span className={`text-[11px] font-semibold ${tone}`}>
      {delta > 0 ? "+" : ""}
      {delta}
      {unit}
    </span>
  );
}

function WhatIfResults({ result }: { result: WhatIfResult }) {
  const { baseline, scenario, diff } = result;
  const rows: Array<[string, keyof typeof baseline.kpis, string]> = [
    ["Tasks scheduled", "tasks_scheduled", ""],
    ["P1 scheduled", "p1_scheduled", ""],
    ["Priority-weighted completion", "priority_weighted_completion_pct", "%"],
    ["Block utilisation", "block_utilization_pct", "%"],
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-[13px] font-semibold text-slate-800">Baseline vs scenario</div>
          <div className="mb-2 text-[11px] text-slate-500">
            {result.changes.length ? result.changes.join(" · ") : "No changes"}
          </div>
          <table className="w-full text-left text-[12px]">
            <thead className="text-[10px] uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-1 font-medium">Metric</th>
                <th className="py-1 font-medium">Baseline</th>
                <th className="py-1 font-medium">Scenario</th>
                <th className="py-1 font-medium">Change</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {rows.map(([label, key, unit]) => (
                <tr key={key} className="border-t border-slate-100">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5">
                    {baseline.kpis[key]}
                    {unit}
                  </td>
                  <td className="py-1.5 font-semibold text-slate-900">
                    {scenario.kpis[key]}
                    {unit}
                  </td>
                  <td className="py-1.5">
                    <Delta
                      before={Number(baseline.kpis[key])}
                      after={Number(scenario.kpis[key])}
                      unit={unit ? " pp" : ""}
                    />
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-100">
                <td className="py-1.5">Solver / validation</td>
                <td className="py-1.5">
                  {baseline.solver.status} / {baseline.validation.passed ? "PASS" : "FAIL"}
                </td>
                <td className="py-1.5 font-semibold text-slate-900">
                  {scenario.solver.status} / {scenario.validation.passed ? "PASS" : "FAIL"}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 self-start">
          {(
            [
              ["No longer scheduled", diff.removed.length, "text-rose-700"],
              ["Newly scheduled", diff.added.length, "text-emerald-700"],
              ["Moved", diff.moved.length, "text-amber-700"],
              ["Unchanged", diff.unchanged, "text-slate-700"],
            ] as const
          ).map(([label, value, tone]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {label}
              </div>
              <div className={`mt-1 text-[22px] font-semibold ${tone}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DiffList
          title="No longer scheduled"
          empty="Nothing dropped out of the plan."
          rows={diff.removed.map((row) => ({
            key: row.task_id,
            title: `${row.task_id} · priority ${row.priority_score}`,
            lines: [`was ${formatSlot(row.from)}`, row.reason],
          }))}
        />
        <DiffList
          title="Newly scheduled"
          empty="No task entered the plan."
          rows={diff.added.map((row) => ({
            key: row.task_id,
            title: `${row.task_id} · priority ${row.priority_score}`,
            lines: [`now ${formatSlot(row.to)}`],
          }))}
        />
        <DiffList
          title="Moved"
          empty="No task moved."
          rows={diff.moved.map((row) => ({
            key: row.task_id,
            title: `${row.task_id} · priority ${row.priority_score}`,
            lines: [`${formatSlot(row.from)} → ${formatSlot(row.to)}`],
          }))}
        />
      </div>
    </section>
  );
}

function DiffList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ key: string; title: string; lines: string[] }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 text-[12px] font-semibold text-slate-800">
        {title} ({rows.length})
      </div>
      {rows.length ? (
        <ul className="max-h-80 space-y-2 overflow-auto text-[11px]">
          {rows.map((row) => (
            <li key={row.key} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1.5">
              <div className="font-semibold text-slate-800">{row.title}</div>
              {row.lines.map((line) => (
                <div key={line} className="text-slate-600">
                  {line}
                </div>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-[11px] text-slate-500">{empty}</div>
      )}
    </div>
  );
}
