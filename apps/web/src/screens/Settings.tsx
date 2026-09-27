import { DataTable, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getSettings } from "../services/workspaceService";
import { ErrorNote, KeyValueGrid, Loading } from "./common";

export default function Settings() {
  const { data, error } = useApi(getSettings);
  if (error) return <ErrorNote message="Settings are unavailable. Check the API connection." />;
  if (!data) return <Loading what="settings" />;

  const model = data.model ?? {};
  const metrics = (model.metrics ?? {}) as Record<string, unknown>;

  return (
    <>
      <PageHeader
        section="SETTINGS"
        title="Effective configuration"
        subtitle="Read-only. Values come from the running services and environment variables (PLANNING_DATE, PLANNING_HORIZON_DAYS)."
      />
      <div className="grid-2-cols">
        <SectionPanel title="Planning">
          <KeyValueGrid
            rows={[
              ["Planning date", data.planningDate],
              ["Date source", data.planningDateSource],
              ["Horizon", `${data.horizonDays} days`],
              ...Object.entries(data.priorityBands).map(([band, range]) => [`Priority ${band}`, range] as [string, string]),
              ...Object.entries(data.trainImpactBands).map(([band, range]) => [`Train impact ${band}`, range] as [string, string]),
            ]}
          />
        </SectionPanel>
        <SectionPanel title="Solver">
          <KeyValueGrid
            rows={[
              ["Engine", data.solver.engine],
              ["Time limit", `${data.solver.timeLimitSeconds} s per solve`],
              ["What-if mode", data.solver.whatIfMode],
            ]}
          />
        </SectionPanel>
        <SectionPanel title="Priority model">
          {data.model ? (
            <>
            <KeyValueGrid
              rows={[
                ["Version", String(model.model_version ?? "–")],
                ["Trained", String(model.trained_at ?? "–")],
                ["Training rows", String(model.rows ?? "–")],
                ...Object.entries(metrics).map(([key, value]) => {
                  const scores = value as { mae?: number; r2?: number };
                  return [key, `MAE ${scores.mae ?? "–"} · R² ${scores.r2 ?? "–"}`] as [string, string];
                }),
              ]}
            />
            {typeof model.label_note === "string" && (
              <p className="muted-note" style={{ marginTop: 8 }}>{model.label_note}</p>
            )}
            </>
          ) : (
            <p className="muted-note">ML service not reachable.</p>
          )}
        </SectionPanel>
        <SectionPanel title="Services" noPadding>
          <DataTable
            data={data.services}
            keyField="name"
            columns={[
              { header: "Service", accessor: "name" },
              { header: "URL", accessor: (row) => <span className="cell-mono">{row.url}</span> },
              { header: "Health", accessor: (row) => <StatusBadge status={row.up ? "READY" : "CRITICAL"} label={row.up ? "Up" : "Down"} />, width: 90 },
            ]}
          />
        </SectionPanel>
      </div>
    </>
  );
}
