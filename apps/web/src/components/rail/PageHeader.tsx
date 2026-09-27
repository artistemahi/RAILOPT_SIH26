import type { ReactNode } from "react";

interface PageHeaderProps {
  section: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  metadata?: ReactNode;
  status?: ReactNode;
}

export function PageHeader({
  section,
  title,
  subtitle,
  action,
  metadata,
  status,
}: PageHeaderProps) {
  return (
    <div className="rail-page-header">
      <div className="header-main">
        <div className="header-meta-row">
          <span className="section-label">{section}</span>
          {status && <div className="header-status">{status}</div>}
        </div>
        <h1 className="header-title">{title}</h1>
        <p className="header-subtitle">{subtitle}</p>
      </div>
      {(action || metadata) && (
        <div className="header-actions">
          {metadata && <div className="header-meta-group">{metadata}</div>}
          {action && <div className="header-action-button">{action}</div>}
        </div>
      )}
    </div>
  );
}
