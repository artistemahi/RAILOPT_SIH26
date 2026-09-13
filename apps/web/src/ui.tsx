import type { ReactNode, SVGProps } from "react";
import { StatusBadge } from "./components/rail/StatusBadge";

export function Ico({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      {children}
    </svg>
  );
}

export const icons: Record<string, ReactNode> = {
  overview: (
    <Ico>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Ico>
  ),
  planning: (
    <Ico>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Ico>
  ),
  tasks: (
    <Ico>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m4 6 1.5 1.5L7 5M4 12l1.5 1.5L7 11M4 18l1.5 1.5L7 17" />
    </Ico>
  ),
  blocks: (
    <Ico>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <path d="M8 6v12M16 6v12" />
    </Ico>
  ),
  compatibility: (
    <Ico>
      <circle cx="9" cy="9" r="5" />
      <circle cx="15" cy="15" r="5" />
    </Ico>
  ),
  optimizer: (
    <Ico>
      <path d="m13 2-8 11h6l-1 9 9-12h-6l1-8Z" />
    </Ico>
  ),
  schedule: (
    <Ico>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </Ico>
  ),
  analytics: (
    <Ico>
      <path d="M4 20h16M7 16v-5M12 16V8M17 16v-9" />
    </Ico>
  ),
  replanning: (
    <Ico>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M21 21v-5h-5" />
    </Ico>
  ),
  validation: (
    <Ico>
      <path d="M12 3 4 7v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7l-8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </Ico>
  ),
  integration: (
    <Ico>
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 12h3m3-4.5-3 3.5m0 0 3 3.5" />
    </Ico>
  ),
  quality: (
    <Ico>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </Ico>
  ),
  settings: (
    <Ico>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Ico>
  ),
};

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <StatusBadge status={tone || "neutral"} label={children} />;
}

export function Card({
  title,
  meta,
  rail,
  children,
  className = "",
}: {
  title?: ReactNode;
  meta?: ReactNode;
  rail?: string;
  children: ReactNode;
  className?: string;
}) {
  let accent: "navy" | "critical" | "warning" | "success" | "none" = "none";
  if (rail === "crit" || rail === "danger") accent = "critical";
  else if (rail === "warn" || rail === "gold") accent = "warning";
  else if (rail === "ok") accent = "success";
  else if (rail === "blue") accent = "navy";

  return (
    <div className={`rail-panel ${accent !== "none" ? `accent-${accent}` : ""} ${className}`}>
      {title && (
        <div className="panel-header">
          <div className="panel-header-title-group">
            <h3 className="panel-title">{title}</h3>
            {meta && <span className="panel-subtitle">{meta}</span>}
          </div>
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  );
}

export function Spark({ pts, color = "#12345B" }: { pts: number[]; color?: string }) {
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const d = pts
    .map((v, i) => {
      const x = (i / (pts.length - 1)) * 68;
      const y = 20 - ((v - min) / (max - min || 1)) * 16;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width="70" height="24" viewBox="0 0 70 24" className="sparkline-svg">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Donut({
  segments,
  center,
  label,
}: {
  segments: { value: number; color: string }[];
  center: string;
  label: string;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  const r = 38;
  const c = 2 * Math.PI * r;
  return (
    <div className="rail-donut-container" style={{ position: "relative", width: 110, height: 110, margin: "0 auto" }}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="#E5EBF0" strokeWidth="12" />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          const dash = `${len} ${c - len}`;
          const offset = -acc;
          acc += len;
          return (
            <circle
              key={i}
              cx="55"
              cy="55"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--navy-primary)" }}>{center}</span>
        <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase" }}>{label}</span>
      </div>
    </div>
  );
}

export function Bar({ value, tone = "" }: { value: number; tone?: string }) {
  let barClass = "";
  if (tone === "g" || tone === "ok") barClass = "bar-success";
  else if (tone === "a" || tone === "warn") barClass = "bar-warning";
  else if (tone === "danger" || tone === "crit") barClass = "bar-danger";
  else if (tone === "info") barClass = "bar-info";

  return (
    <div className="rail-progress-track">
      <div
        className={`rail-progress-bar ${barClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
