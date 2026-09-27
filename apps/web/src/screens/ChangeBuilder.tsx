import { useMemo, useState } from "react";
import { useApi } from "../hooks/useApi";
import { getWhatIfOptions } from "../services/whatIfService";
import type { WhatIfChange, WhatIfChangeType, WhatIfOptions } from "../types/whatIf";

export const changeLabels: Record<WhatIfChangeType, string> = {
  WINDOW_UNAVAILABLE: "Block window lost",
  WINDOW_SHORTEN: "Block window shortened",
  RESOURCE_UNAVAILABLE: "Resource unavailable",
  TASK_DURATION: "Task takes longer",
  TASK_PRIORITY: "Task priority changed",
  TASK_REMOVE: "Task removed",
  TRAIN_ADD: "Extra train movement",
};

export function describeChange(change: WhatIfChange): string {
  switch (change.type) {
    case "WINDOW_UNAVAILABLE":
      return `${change.window_id} lost`;
    case "WINDOW_SHORTEN":
      return `${change.window_id} shortened by ${change.minutes} min`;
    case "RESOURCE_UNAVAILABLE":
      return `${change.resource_id} unavailable`;
    case "TASK_DURATION":
      return `${change.task_id} +${change.minutes} min`;
    case "TASK_PRIORITY":
      return `${change.task_id} priority → ${change.priority_score}`;
    case "TASK_REMOVE":
      return `${change.task_id} removed`;
    case "TRAIN_ADD":
      return `Train on ${change.section_id} ${change.start_time?.slice(5, 16)}–${change.end_time?.slice(11, 16)}`;
  }
}

function windowLabel(window: WhatIfOptions["windows"][number]): string {
  return `${window.window_id} · ${window.sections.join("+")} · ${window.start_time.slice(5, 16)}–${window.end_time.slice(11, 16)}`;
}

/** Build a list of planning changes (disruptions or planner edits). */
export function ChangeBuilder({
  types,
  changes,
  onChange,
}: {
  types: WhatIfChangeType[];
  changes: WhatIfChange[];
  onChange: (changes: WhatIfChange[]) => void;
}) {
  const { data: options, error } = useApi(getWhatIfOptions);
  const [type, setType] = useState<WhatIfChangeType>(types[0]!);
  const [draft, setDraft] = useState<Partial<WhatIfChange>>({});

  const windows = useMemo(() => options?.windows.filter((window) => window.available) ?? [], [options]);
  const tasks = useMemo(
    () => [...(options?.tasks ?? [])].sort((a, b) => b.priority_score - a.priority_score),
    [options],
  );

  if (error) return <p style={{ color: "var(--state-critical)" }}>Planning options unavailable.</p>;
  if (!options) return <p className="muted-note">Loading planning options…</p>;

  const ready = (() => {
    switch (type) {
      case "WINDOW_UNAVAILABLE":
        return Boolean(draft.window_id);
      case "WINDOW_SHORTEN":
      case "TASK_DURATION":
        return Boolean((draft.window_id || draft.task_id) && draft.minutes && draft.minutes > 0);
      case "RESOURCE_UNAVAILABLE":
        return Boolean(draft.resource_id);
      case "TASK_PRIORITY":
        return Boolean(draft.task_id && draft.priority_score !== undefined);
      case "TASK_REMOVE":
        return Boolean(draft.task_id);
      case "TRAIN_ADD":
        return Boolean(draft.section_id && draft.start_time && draft.end_time);
    }
  })();

  const windowSelect = (
    <select className="rail-select" value={draft.window_id ?? ""} onChange={(event) => setDraft({ ...draft, window_id: event.target.value })}>
      <option value="">Window…</option>
      {windows.map((window) => (
        <option key={window.window_id} value={window.window_id}>{windowLabel(window)}</option>
      ))}
    </select>
  );
  const taskSelect = (
    <select className="rail-select" value={draft.task_id ?? ""} onChange={(event) => setDraft({ ...draft, task_id: event.target.value })}>
      <option value="">Pending task…</option>
      {tasks.map((task) => (
        <option key={task.task_id} value={task.task_id}>
          {task.task_id} · {task.department} · {task.section_id} · {task.priority_score}
        </option>
      ))}
    </select>
  );
  const minutes = (
    <input
      type="number"
      min={1}
      placeholder="minutes"
      className="rail-input"
      style={{ width: 90 }}
      value={draft.minutes ?? ""}
      onChange={(event) => setDraft({ ...draft, minutes: Number(event.target.value) || undefined })}
    />
  );
  const horizonStart = `${options.planning_date}T00:00`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="chip-row">
        <select
          className="rail-select"
          value={type}
          onChange={(event) => {
            setType(event.target.value as WhatIfChangeType);
            setDraft({});
          }}
        >
          {types.map((value) => (
            <option key={value} value={value}>{changeLabels[value]}</option>
          ))}
        </select>
        {(type === "WINDOW_UNAVAILABLE" || type === "WINDOW_SHORTEN") && windowSelect}
        {type === "WINDOW_SHORTEN" && minutes}
        {type === "RESOURCE_UNAVAILABLE" && (
          <select className="rail-select" value={draft.resource_id ?? ""} onChange={(event) => setDraft({ ...draft, resource_id: event.target.value })}>
            <option value="">Resource…</option>
            {options.resources.map((resource) => (
              <option key={resource.resource_id} value={resource.resource_id}>
                {resource.resource_id} · {resource.department} · {resource.status}
              </option>
            ))}
          </select>
        )}
        {(type === "TASK_DURATION" || type === "TASK_PRIORITY" || type === "TASK_REMOVE") && taskSelect}
        {type === "TASK_DURATION" && minutes}
        {type === "TASK_PRIORITY" && (
          <input
            type="number"
            min={0}
            max={100}
            placeholder="new score"
            className="rail-input"
            style={{ width: 90 }}
            value={draft.priority_score ?? ""}
            onChange={(event) =>
              setDraft({ ...draft, priority_score: event.target.value === "" ? undefined : Number(event.target.value) })
            }
          />
        )}
        {type === "TRAIN_ADD" && (
          <>
            <select className="rail-select" value={draft.section_id ?? ""} onChange={(event) => setDraft({ ...draft, section_id: event.target.value })}>
              <option value="">Section…</option>
              {options.sections.map((section) => (
                <option key={section} value={section}>{section}</option>
              ))}
            </select>
            <input
              type="datetime-local"
              className="rail-input"
              min={horizonStart}
              onChange={(event) => setDraft({ ...draft, start_time: `${event.target.value.replace("T", " ")}:00` })}
            />
            <input
              type="datetime-local"
              className="rail-input"
              min={horizonStart}
              onChange={(event) => setDraft({ ...draft, end_time: `${event.target.value.replace("T", " ")}:00` })}
            />
          </>
        )}
        <button
          type="button"
          className="btn-rail btn-rail-secondary"
          disabled={!ready}
          onClick={() => {
            onChange([...changes, { ...draft, type } as WhatIfChange]);
            setDraft({});
          }}
        >
          Add
        </button>
      </div>
      {changes.length > 0 && (
        <div className="chip-row">
          {changes.map((change, index) => (
            <span key={index} className="filter-chip active">
              {describeChange(change)}{" "}
              <button
                type="button"
                aria-label="Remove change"
                onClick={() => onChange(changes.filter((_, other) => other !== index))}
                style={{ marginLeft: 4, fontWeight: 700 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
