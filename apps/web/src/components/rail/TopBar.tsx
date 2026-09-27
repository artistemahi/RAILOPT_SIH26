import { useApi } from "../../hooks/useApi";
import { getSettings } from "../../services/workspaceService";
import { usePlan } from "../../state/PlanContext";
import { StatusBadge } from "./StatusBadge";

export function TopBar({ pageName }: { pageName: string }) {
  const { data: settings } = useApi(getSettings);
  const { plan, version, planning } = usePlan();

  return (
    <header className="rail-topbar">
      <div className="topbar-left">
        <div className="current-location">
          <span className="location-dept">RAILOPT</span>
          <span className="location-sep">/</span>
          <span className="location-page">{pageName}</span>
          <span className="simulation-tag" title="All data is synthetic; this is a decision-support prototype">
            SYNTHETIC DATA
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="metadata-cluster">
          <div className="meta-cell">
            <span className="meta-label">PLANNING DATE</span>
            <span className="meta-val mono-val font-semibold">{settings?.planningDate ?? "…"}</span>
          </div>
          <span className="v-divider" />
          <div className="meta-cell">
            <span className="meta-label">HORIZON</span>
            <span className="meta-val mono-val">{settings ? `${settings.horizonDays} days` : "…"}</span>
          </div>
          <span className="v-divider" />
          <div className="meta-cell">
            <span className="meta-label">PLAN IN VIEW</span>
            <span className="meta-val">
              {planning ? (
                <StatusBadge status="PENDING" label="Solving…" />
              ) : plan && version ? (
                <StatusBadge
                  status={plan.validation.passed ? version.status : "FAIL"}
                  label={`V${version.version} · ${version.status} · ${plan.solver.status}`}
                />
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Not generated</span>
              )}
            </span>
          </div>
          <span className="v-divider" />
          <div className="meta-cell">
            <span className="meta-label">SERVICES</span>
            <span className="meta-val">
              {settings
                ? settings.services.every((service) => service.up)
                  ? <StatusBadge status="READY" label="All up" />
                  : <StatusBadge status="WARNING" label={`${settings.services.filter((s) => !s.up).length} down`} />
                : "…"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
