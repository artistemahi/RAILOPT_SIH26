import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getDataSources } from "../services/workspaceService";
import { ErrorNote, Loading } from "./common";

const targetSystems = [
  ["TMS", "Train movements / timetable"],
  ["SMMS", "Asset and maintenance records"],
  ["TDMS", "Track and defect data"],
  ["COA", "Control office block offers"],
];

export default function Integration() {
  const { data, error } = useApi(getDataSources);
  if (error) return <ErrorNote message="Data source status is unavailable. Check the API connection." />;
  if (!data) return <Loading what="data sources" />;

  const totalRows = data.sources.reduce((sum, source) => sum + source.tableRows, 0);
  const outOfSync = data.sources.filter((source) => !source.inSync);

  return (
    <>
      <PageHeader
        section="DATA SOURCES"
        title="Where the data comes from"
        subtitle={`Current: synthetic CSV files in ${data.datasetRoot}, imported into PostgreSQL (railopt schema)`}
      />
      <MetricStrip
        metrics={[
          { label: "CSV files", value: data.sources.length, status: "neutral" },
          { label: "Rows in PostgreSQL", value: totalRows.toLocaleString("en-IN"), status: "info" },
          { label: "CSV ≠ table", value: outOfSync.length, hint: outOfSync.map((source) => source.table).join(", ") || "all match", status: outOfSync.length ? "warning" : "success" },
          { label: "ML priority runs stored", value: data.priorityPredictions.runs, hint: data.priorityPredictions.latest ? `latest ${data.priorityPredictions.latest}` : "none yet", status: "neutral" },
        ]}
      />

      <div className="pipeline-flow">
        <div className="pipeline-node"><div className="node-title">Synthetic CSVs</div><div className="node-desc">data/railopt_raw</div></div>
        <span className="pipeline-arrow">→</span>
        <div className="pipeline-node"><div className="node-title">Importer</div><div className="node-desc">npm run import</div></div>
        <span className="pipeline-arrow">→</span>
        <div className="pipeline-node central-stage"><div className="node-title">PostgreSQL</div><div className="node-desc">railopt.* tables</div></div>
        <span className="pipeline-arrow">→</span>
        <div className="pipeline-node target-db"><div className="node-title">ML · CP-SAT · UI</div><div className="node-desc">read via Node API</div></div>
      </div>

      <div className="grid-65-35">
        <SectionPanel title="Current sources (live row counts)" noPadding>
          <DataTable
            data={data.sources}
            keyField="file"
            columns={[
              { header: "File", accessor: (row) => <span className="cell-mono">{row.file}</span> },
              { header: "Table", accessor: (row) => <span className="cell-mono">railopt.{row.table}</span>, width: 200 },
              { header: "CSV rows", accessor: (row) => row.csvRows ?? "missing", width: 85 },
              { header: "Table rows", accessor: "tableRows", width: 85 },
              { header: "Status", accessor: (row) => <StatusBadge status={row.inSync ? "SYNCED" : "WARNING"} label={row.inSync ? "Match" : "Differs"} />, width: 95 },
            ]}
          />
        </SectionPanel>

        <SectionPanel title="Target architecture (not connected)" accent="warning">
          <p className="muted-note" style={{ marginBottom: 8 }}>
            RAILOPT does not connect to any railway system today. These are the systems a deployment would need
            adapters for; the CSV files stand in for them.
          </p>
          <ul style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {targetSystems.map(([name, role]) => (
              <li key={name} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span><strong>{name}</strong> <span className="muted-note">· {role}</span></span>
                <StatusBadge status="neutral" dot={false} label="Target" />
              </li>
            ))}
          </ul>
        </SectionPanel>
      </div>
    </>
  );
}
