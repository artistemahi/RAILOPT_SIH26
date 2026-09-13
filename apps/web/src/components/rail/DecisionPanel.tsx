import type { ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";

interface WhyWindowReason {
  text: string;
  verified?: boolean;
}

interface DecisionPanelProps {
  blockId: string;
  section: string;
  windowSpan: string;
  duration: string;
  tasks: string[];
  trainImpact: string;
  priorityScore: number | string;
  whyReasons: (string | WhyWindowReason)[];
  onReview?: () => void;
  onApprove?: () => void;
  onHold?: () => void;
  className?: string;
  extraMeta?: ReactNode;
}

export function DecisionPanel({
  blockId,
  section,
  windowSpan,
  duration,
  tasks,
  trainImpact,
  priorityScore,
  whyReasons,
  onReview,
  onApprove,
  onHold,
  className = "",
  extraMeta,
}: DecisionPanelProps) {
  return (
    <div className={`rail-decision-panel ${className}`}>
      <div className="decision-header">
        <div className="decision-badge-row">
          <span className="decision-flag">DECISION SUPPORT</span>
          <StatusBadge status="RECOMMENDED" size="sm" />
        </div>
        <h3 className="decision-title">Recommended Possession Window</h3>
        <p className="decision-subtitle">
          Algorithmic recommendation generated for Section Controller review
        </p>
      </div>

      <div className="decision-body">
        <div className="decision-matrix-strip">
          <div className="matrix-item">
            <span className="item-label">BLOCK ID</span>
            <strong className="item-value mono-val">{blockId}</strong>
          </div>
          <div className="matrix-item">
            <span className="item-label">SECTION</span>
            <strong className="item-value">{section}</strong>
          </div>
          <div className="matrix-item">
            <span className="item-label">WINDOW</span>
            <strong className="item-value mono-val">{windowSpan}</strong>
          </div>
          <div className="matrix-item">
            <span className="item-label">DURATION</span>
            <strong className="item-value">{duration}</strong>
          </div>
        </div>

        <div className="decision-details-grid">
          <div className="detail-row">
            <span className="detail-label">Compatible Backlog Tasks:</span>
            <div className="detail-badges">
              {tasks.map((t) => (
                <span key={t} className="task-pill">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="detail-row">
            <span className="detail-label">Train Path Impact:</span>
            <span className="detail-value text-success">{trainImpact}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Priority Coverage:</span>
            <span className="detail-value text-navy">
              <strong>{priorityScore}</strong> / 100
            </span>
          </div>
        </div>

        <div className="why-window-section">
          <div className="why-title">WHY THIS WINDOW</div>
          <ul className="why-checklist">
            {whyReasons.map((item, idx) => {
              const text = typeof item === "string" ? item : item.text;
              const isOk = typeof item === "string" ? true : item.verified !== false;
              return (
                <li key={idx} className={isOk ? "verified" : "unverified"}>
                  <span className="check-icon">{isOk ? "✓" : "✕"}</span>
                  <span className="check-text">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {extraMeta && <div className="decision-extra">{extraMeta}</div>}

        <div className="decision-footer">
          <div className="human-loop-notice">
            <span className="lock-icon">🔒</span>
            <span>Controller authorization mandatory prior to BDMS submission</span>
          </div>
          <div className="decision-actions">
            {onReview && (
              <button
                type="button"
                className="btn-rail btn-rail-primary"
                onClick={onReview}
              >
                Review Plan
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                className="btn-rail btn-rail-secondary"
                onClick={onApprove}
              >
                Approve Possession
              </button>
            )}
            {onHold && (
              <button
                type="button"
                className="btn-rail btn-rail-ghost"
                onClick={onHold}
              >
                Hold
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
