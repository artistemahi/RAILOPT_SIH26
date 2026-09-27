import type { ReactNode } from "react";
import { SectionPanel } from "../components/rail";
import { usePlan } from "../state/PlanContext";

export const DAY_MINUTES = 24 * 60;

export const reasonLabels: Record<string, string> = {
  WINDOW_TOO_SHORT: "Window too short",
  TRAIN_CONFLICT: "Train conflict",
  RESOURCE_UNAVAILABLE: "Resource unavailable",
  WINDOW_UNAVAILABLE: "Window unavailable",
  BLOCK_TYPE_MISMATCH: "Block type mismatch",
  SECTION_NOT_COVERED: "Section not covered",
  NO_WINDOW_IN_HORIZON: "No window in horizon",
  NO_REQUIREMENT: "No block requirement",
  NO_CANDIDATE: "No candidate window",
  DEPENDENCY_BLOCKED: "Dependency blocked",
  NOT_SELECTED: "Not selected",
  BLOCK_CAPACITY: "Exceeds block max duration",
  SECTION_INACTIVE: "Section inactive",
  NOT_ELECTRIFIED: "Section not electrified",
};

export const edgeLabels: Record<string, string> = {
  SHARED_RESOURCE: "Shared resource",
  SAME_ASSET: "Same asset",
  DEPENDENCY: "Dependency",
  TASK_TYPE_ORDER: "Repair → test order",
  COORDINATION: "Can coordinate",
};

export const edgeHelp: Record<string, string> = {
  SHARED_RESOURCE: "RULE_011: share a mandatory resource, cannot overlap beyond capacity",
  SAME_ASSET: "RAILOPT assumption: one job on an asset at a time",
  DEPENDENCY: "RULE_016: mandatory finish-to-start dependency",
  TASK_TYPE_ORDER: "RULE_032/033: repair or replacement before testing on the same asset",
  COORDINATION: "RULE_001/034: same section, shared candidate window, no conflict",
};

export const departmentColors: Record<string, string> = {
  ENGINEERING: "#12345B",
  TRD: "#A86A00",
  "S&T": "#16834B",
};

export function dayLabel(planningDate: string, dayIndex: number): string {
  const date = new Date(new Date(`${planningDate}T00:00:00`).getTime() + dayIndex * 86_400_000);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function Loading({ what }: { what: string }) {
  return <div className="rail-panel"><div className="panel-body muted-note">Loading {what}…</div></div>;
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="rail-panel accent-critical">
      <div className="panel-body" style={{ color: "var(--state-critical)" }}>{message}</div>
    </div>
  );
}

/** Buttons and states shared by every screen that shows the latest plan. */
export function GenerateButton({ label }: { label?: string }) {
  const { plan, planning, generate } = usePlan();
  return (
    <button
      type="button"
      className="btn-rail btn-rail-primary"
      disabled={planning}
      onClick={() => void generate()}
    >
      {planning ? "Solving…" : label ?? (plan ? "Re-run plan" : "Generate plan (ML → CP-SAT)")}
    </button>
  );
}

export function PlanRequired({ children }: { children: ReactNode }) {
  const { plan, planning, error } = usePlan();
  if (plan) return <>{children}</>;
  return (
    <SectionPanel title="No plan generated yet" accent="info">
      <p style={{ marginBottom: 10, color: "var(--text-secondary)" }}>
        This view shows the latest planning run. A run scores every task with the ML
        priority model, then CP-SAT assigns pending tasks to block windows and an
        independent validator re-checks the result.
      </p>
      {error && <p style={{ color: "var(--state-critical)", marginBottom: 10 }}>{error}</p>}
      <GenerateButton label={planning ? undefined : "Generate plan (ML → CP-SAT)"} />
    </SectionPanel>
  );
}

export function KeyValueGrid({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <div className="kv-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="kv-row">
          <span className="kv-label">{label}</span>
          <span className="kv-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
