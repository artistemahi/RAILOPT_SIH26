import type { ReactNode } from "react";

export interface MetricItem {
  label: string;
  value: string | number;
  delta?: string;
  hint?: string;
  status?: "success" | "warning" | "danger" | "info" | "neutral";
  code?: string;
  sparkline?: ReactNode;
}

interface MetricStripProps {
  metrics: MetricItem[];
  columns?: number;
  className?: string;
}

export function MetricStrip({
  metrics,
  columns,
  className = "",
}: MetricStripProps) {
  const colCount = columns || metrics.length;

  return (
    <div
      className={`rail-metric-strip ${className}`}
      style={{
        gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
      }}
    >
      {metrics.map((m, idx) => {
        const statusTone = m.status || "neutral";
        return (
          <div
            key={idx}
            className={`metric-cell status-${statusTone}`}
          >
            <div className="metric-header">
              <span className="metric-label">{m.label}</span>
              {m.code && <span className="metric-code">{m.code}</span>}
            </div>
            <div className="metric-value-row">
              <span className="metric-value">{m.value}</span>
              {m.sparkline && <div className="metric-spark">{m.sparkline}</div>}
            </div>
            {(m.delta || m.hint) && (
              <div className="metric-footer">
                {m.delta && (
                  <span className={`metric-delta tone-${statusTone}`}>
                    {m.delta}
                  </span>
                )}
                {m.hint && <span className="metric-hint">{m.hint}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
