import type { ReactNode } from "react";

interface SectionPanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  level?: 1 | 2 | 3;
  accent?: "navy" | "critical" | "warning" | "success" | "info" | "none";
  className?: string;
  children: ReactNode;
  noPadding?: boolean;
}

export function SectionPanel({
  title,
  subtitle,
  action,
  level = 2,
  accent = "none",
  className = "",
  children,
  noPadding = false,
}: SectionPanelProps) {
  if (level === 1) {
    return (
      <div className={`rail-section-flat ${className}`}>
        {(title || action) && (
          <div className="section-flat-header">
            <div>
              {title && <h2 className="section-flat-title">{title}</h2>}
              {subtitle && <p className="section-flat-subtitle">{subtitle}</p>}
            </div>
            {action && <div className="section-flat-action">{action}</div>}
          </div>
        )}
        <div className="section-flat-content">{children}</div>
      </div>
    );
  }

  const levelClass = level === 3 ? "panel-level-3" : "panel-level-2";
  const accentClass = accent !== "none" ? `accent-${accent}` : "";

  return (
    <div
      className={`rail-panel ${levelClass} ${accentClass} ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="panel-header">
          <div className="panel-header-title-group">
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <span className="panel-subtitle">{subtitle}</span>}
          </div>
          {action && <div className="panel-action">{action}</div>}
        </div>
      )}
      <div className={`panel-body ${noPadding ? "no-padding" : ""}`}>
        {children}
      </div>
    </div>
  );
}
