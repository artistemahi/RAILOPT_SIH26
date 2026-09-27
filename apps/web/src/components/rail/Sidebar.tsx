import { NavLink } from "react-router-dom";
import { usePlan } from "../../state/PlanContext";
import { icons } from "../../ui";

interface NavItemDef {
  to: string;
  icon: string;
  label: string;
}

const groups: Array<{ heading: string; items: NavItemDef[] }> = [
  {
    heading: "OPERATIONAL PLANNING",
    items: [
      { to: "/overview", icon: "overview", label: "Command Center" },
      { to: "/planning", icon: "planning", label: "Planning Run" },
      { to: "/tasks", icon: "tasks", label: "Maintenance Tasks" },
      { to: "/blocks", icon: "blocks", label: "Block Windows" },
      { to: "/compatibility", icon: "compatibility", label: "Coordination" },
      { to: "/optimizer", icon: "optimizer", label: "Optimization" },
      { to: "/schedule", icon: "schedule", label: "Weekly Schedule" },
      { to: "/monthly", icon: "monthly", label: "Monthly Plan" },
      { to: "/validation", icon: "validation", label: "Validation" },
      { to: "/versions", icon: "versions", label: "Versions & Approval" },
      { to: "/what-if", icon: "whatif", label: "What-if" },
      { to: "/replanning", icon: "replanning", label: "Replanning" },
    ],
  },
  {
    heading: "ANALYSIS",
    items: [
      { to: "/analytics", icon: "analytics", label: "Analytics" },
      { to: "/risk", icon: "risk", label: "Risk & Priority" },
      { to: "/network", icon: "network", label: "Network Map" },
    ],
  },
  {
    heading: "PLATFORM & GOVERNANCE",
    items: [
      { to: "/integration", icon: "integration", label: "Data Sources" },
      { to: "/quality", icon: "quality", label: "Data Quality" },
      { to: "/settings", icon: "settings", label: "Settings" },
    ],
  },
];

export function Sidebar() {
  const { plan, version } = usePlan();

  // Badges only show real state: the plan in view and its validation.
  const badges: Record<string, { text: string; tone: string } | undefined> = {
    "/validation": plan
      ? plan.validation.passed
        ? { text: "PASS", tone: "success" }
        : { text: "FAIL", tone: "danger" }
      : undefined,
    "/versions": version
      ? { text: `V${version.version}`, tone: version.status === "APPROVED" ? "success" : version.status === "DRAFT" ? "warning" : "neutral" }
      : undefined,
  };

  return (
    <aside className="rail-sidebar">
      <div className="sidebar-brand-area">
        <div className="emblem-container">
          <div className="railway-emblem">RO</div>
        </div>
        <div className="brand-text-block">
          <div className="brand-primary">RAILOPT</div>
          <div className="brand-subtitle">Maintenance Block Planning</div>
        </div>
      </div>

      <div className="sidebar-scrollable">
        {groups.map((group) => (
          <div key={group.heading} className="nav-group">
            <div className="nav-group-heading">{group.heading}</div>
            <nav className="nav-list">
              {group.items.map((item) => {
                const badge = badges[item.to];
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                    title={item.label}
                  >
                    <span className="nav-icon">{icons[item.icon]}</span>
                    <span className="nav-label">{item.label}</span>
                    {badge && <span className={`nav-badge badge-${badge.tone}`}>{badge.text}</span>}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="user-profile-strip">
          <div className="user-indicator">
            <span className="user-dot active" />
          </div>
          <div className="user-meta">
            <div className="user-title">Maintenance Planner</div>
            <div className="user-org">Synthetic dataset · Prototype</div>
            <div className="user-compliance">Decision support · planner approves</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
