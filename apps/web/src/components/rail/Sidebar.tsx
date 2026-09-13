import { icons } from "../../ui";

export type NavView =
  | "overview"
  | "planning"
  | "tasks"
  | "blocks"
  | "compatibility"
  | "optimizer"
  | "schedule"
  | "analytics"
  | "replanning"
  | "validation"
  | "integration"
  | "quality"
  | "settings";

interface NavItemDef {
  id: NavView;
  label: string;
  badge?: string;
  badgeTone?: "danger" | "warning" | "success" | "neutral";
}

const operationalNav: NavItemDef[] = [
  { id: "overview", label: "Command Center" },
  { id: "planning", label: "Block Planning" },
  { id: "tasks", label: "Maintenance Tasks", badge: "47", badgeTone: "danger" },
  { id: "blocks", label: "Possession Blocks" },
  { id: "compatibility", label: "Coordination" },
  { id: "optimizer", label: "Optimization" },
  { id: "schedule", label: "Schedule" },
  { id: "analytics", label: "Analytics" },
  { id: "replanning", label: "Replanning", badge: "CRIT", badgeTone: "warning" },
  { id: "validation", label: "Validation", badge: "6/6", badgeTone: "success" },
];

const platformNav: NavItemDef[] = [
  { id: "integration", label: "Data Integration" },
  { id: "quality", label: "Data Quality", badge: "100%", badgeTone: "neutral" },
  { id: "settings", label: "Settings" },
];

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  collapsed?: boolean;
}

export function Sidebar({
  currentView,
  onSelectView,
  collapsed = false,
}: SidebarProps) {
  return (
    <aside className={`rail-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand-area">
        <div className="emblem-container">
          <div className="railway-emblem">IR</div>
        </div>
        <div className="brand-text-block">
          <div className="brand-primary">RAILOPT</div>
          <div className="brand-subtitle">Automatic Maintenance Block Planning</div>
        </div>
      </div>

      <div className="sidebar-scrollable">
        <div className="nav-group">
          <div className="nav-group-heading">OPERATIONAL PLANNING</div>
          <nav className="nav-list">
            {operationalNav.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectView(item.id)}
                  title={item.label}
                >
                  <span className="nav-icon">{icons[item.id]}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge badge-${item.badgeTone || "neutral"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="nav-group">
          <div className="nav-group-heading">PLATFORM & GOVERNANCE</div>
          <nav className="nav-list">
            {platformNav.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectView(item.id)}
                  title={item.label}
                >
                  <span className="nav-icon">{icons[item.id]}</span>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`nav-badge badge-${item.badgeTone || "neutral"}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-strip">
          <div className="user-indicator">
            <span className="user-dot active" />
          </div>
          <div className="user-meta">
            <div className="user-title">Section Controller</div>
            <div className="user-org">Northern Railway · PRYJ Div</div>
            <div className="user-compliance">Decision Support · Demo Environment</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
