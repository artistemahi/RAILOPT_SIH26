import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { useApi } from "../hooks/useApi";
import { getDataQuality } from "../services/workspaceService";
import { ErrorNote, Loading } from "./common";

export default function Quality() {
  const { data, error } = useApi(getDataQuality);
  if (error) return <ErrorNote message="Data quality checks are unavailable. Check the API connection." />;
  if (!data) return <Loading what="data quality checks" />;

  const count = (status: string) => data.checks.filter((check) => check.status === status).length;

  return (
    <>
      <PageHeader
        section="DATA QUALITY"
        title="Dataset integrity checks"
        subtitle={`Run live against the railopt.* tables on each load · planning date ${data.planningDate}`}
      />
      <MetricStrip
        metrics={[
          { label: "Checks", value: data.checks.length, status: "neutral" },
          { label: "Pass", value: count("PASS"), status: "success" },
          { label: "Warnings", value: count("WARN"), status: count("WARN") ? "warning" : "success" },
          { label: "Failures", value: count("FAIL"), status: count("FAIL") ? "danger" : "success" },
        ]}
      />
      <SectionPanel title="Checks" noPadding>
        <DataTable
          data={data.checks}
          keyField="id"
          columns={[
            { header: "Check", accessor: (row) => <span className="cell-mono">{row.id}</span>, width: 230 },
            { header: "Category", accessor: "category", width: 110 },
            { header: "What is checked", accessor: "description" },
            { header: "Rows", accessor: "failing", width: 70 },
            { header: "Result", accessor: (row) => <StatusBadge status={row.status === "WARN" ? "WARNING" : row.status} label={row.status} />, width: 90 },
          ]}
        />
      </SectionPanel>
      <p className="muted-note">
        WARN is informational (for example, overdue work is expected in the dataset); FAIL would block trustworthy planning.
      </p>
    </>
  );
}
