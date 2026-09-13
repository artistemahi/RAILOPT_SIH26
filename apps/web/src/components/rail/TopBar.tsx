import type { ReactNode } from "react";
import { runMeta } from "../../ops-data";

interface TopBarProps {
  pageName: string;
  sectionCode?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  actions?: ReactNode;
}

export function TopBar({
  pageName,
  sectionCode,
  searchQuery = "",
  onSearchChange,
  actions,
}: TopBarProps) {
  return (
    <header className="rail-topbar">
      <div className="topbar-left">
        <div className="current-location">
          <span className="location-dept">INDIAN RAILWAYS</span>
          <span className="location-sep">/</span>
          <span className="location-page">{pageName}</span>
          <span className="simulation-tag" title="Demonstration prototype operating on synthetic corridor telemetry">
            DEMO SCENARIO
          </span>
        </div>
      </div>

      <div className="topbar-center">
        <div className="operational-search">
          <svg
            className="search-icon"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M12.5 12.5L16.5 16.5" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks, blocks, assets, trains, windows…"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="search-input"
          />
          <span className="search-shortcut">Ctrl+K</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="metadata-cluster">
          <div className="meta-cell">
            <span className="meta-label">PLANNING RUN</span>
            <span className="meta-val mono-val font-semibold">{runMeta.id}</span>
          </div>
          <span className="v-divider" />

          <div className="meta-cell">
            <span className="meta-label">DIVISION</span>
            <span className="meta-val">Northern Railway</span>
          </div>
          <span className="v-divider" />

          <div className="meta-cell">
            <span className="meta-label">SECTION</span>
            <span className="meta-val mono-val">{sectionCode || "NDLS–CNB"}</span>
          </div>
          <span className="v-divider" />

          <div className="meta-cell time-cell">
            <span className="meta-label">CLOCK</span>
            <span className="meta-val mono-val">{runMeta.clock}</span>
          </div>
          <span className="v-divider" />

          <div className="meta-cell controller-cell">
            <div className="controller-badge">
              <span className="controller-status-dot" aria-hidden="true" />
              <div className="controller-info">
                <span className="controller-role">Section Controller</span>
                <span className="controller-id">PRYJ Division</span>
              </div>
            </div>
          </div>
        </div>
        {actions && <div className="topbar-custom-actions">{actions}</div>}
      </div>
    </header>
  );
}
