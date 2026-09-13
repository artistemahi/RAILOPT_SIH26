import type { ReactNode } from "react";

export type OperationalStatus =
  | "CONNECTED"
  | "SYNCED"
  | "READY"
  | "PASS"
  | "VALID"
  | "OPTIMAL"
  | "FEASIBLE"
  | "WARNING"
  | "WATCH"
  | "HOLD"
  | "CRITICAL"
  | "BLOCKED"
  | "RESTRICTED"
  | "PENDING"
  | "APPROVED"
  | "COMMITTED"
  | "DRAFT"
  | "PLANNED"
  | "AVAILABLE"
  | "USED"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "MANAGED"
  | string;

interface StatusBadgeProps {
  status: OperationalStatus;
  label?: ReactNode;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  dot = true,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  const norm = String(status).toUpperCase();

  let tone: "success" | "warning" | "danger" | "info" | "neutral" = "neutral";

  if (
    norm === "PASS" ||
    norm === "VALID" ||
    norm === "OPTIMAL" ||
    norm === "CONNECTED" ||
    norm === "SYNCED" ||
    norm === "READY" ||
    norm === "PLANNED" ||
    norm === "AVAILABLE" ||
    norm === "APPROVED" ||
    norm === "COMMITTED"
  ) {
    tone = "success";
  } else if (
    norm === "WARNING" ||
    norm === "WATCH" ||
    norm === "HOLD" ||
    norm === "PENDING" ||
    norm === "DRAFT" ||
    norm === "MEDIUM" ||
    norm === "MANAGED"
  ) {
    tone = "warning";
  } else if (
    norm === "CRITICAL" ||
    norm === "BLOCKED" ||
    norm === "RESTRICTED" ||
    norm === "USED" ||
    norm === "FAIL" ||
    norm === "HIGH"
  ) {
    tone = "danger";
  } else if (norm === "FEASIBLE" || norm === "LOW" || norm === "INFO") {
    tone = "info";
  }

  const displayText = label !== undefined ? label : status;

  return (
    <span
      className={`rail-status-badge rail-status-${tone} size-${size} ${className}`}
      title={`Operational Status: ${norm}`}
    >
      {dot && <span className="status-dot" aria-hidden="true" />}
      <span className="status-label">{displayText}</span>
    </span>
  );
}
