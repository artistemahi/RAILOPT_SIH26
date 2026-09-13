import { Fragment, useMemo, useState } from "react";
import {
  alerts,
  blocks,
  combineReasons,
  deptBars,
  gantt,
  heat,
  highPriorityQueue,
  kpiCompare,
  kpis,
  liveFeed,
  matrix,
  matrixIds,
  objectives,
  priorityMix,
  qualityChecks,
  recentRuns,
  resources,
  runMeta,
  solverLog,
  sources,
  stations,
  tasks,
  trainImpactSummary,
  trains,
  utilization,
  validation,
  weekDays,
  whyT101,
  windows,
} from "./ops-data";
import {
  CorridorSchematic,
  DataTable,
  DecisionPanel,
  MetricStrip,
  PageHeader,
  SectionPanel,
  StatusBadge,
} from "./components/rail";
import { Bar, Donut, Spark } from "./ui";

/* ====================================================
   1. OVERVIEW / COMMAND CENTER
   ==================================================== */
export function Overview({ go }: { go: (v: string) => void }) {
  const [selectedTask, setSelectedTask] = useState("T101");
  const [selectedStation, setSelectedStation] = useState("TDL");

  const overviewMetrics = [
    {
      label: "Maintenance Tasks",
      value: "500",
      code: "BACKLOG",
      delta: "+12%",
      hint: "vs last week",
      status: "neutral" as const,
      sparkline: <Spark pts={[38, 42, 40, 51, 48, 55, 62]} color="#12345B" />,
    },
    {
      label: "Critical / Overdue",
      value: "47",
      code: "SLA ALERT",
      delta: "+8%",
      hint: "need same-day window",
      status: "danger" as const,
      sparkline: <Spark pts={[22, 28, 31, 29, 36, 41, 47]} color="#C62828" />,
    },
    {
      label: "Available Windows",
      value: "86",
      code: "COA LOCKED",
      delta: "+15%",
      hint: "offered by control",
      status: "success" as const,
      sparkline: <Spark pts={[54, 58, 61, 66, 70, 79, 86]} color="#16834B" />,
    },
    {
      label: "Scheduled Tasks",
      value: "382",
      code: "PACKED",
      delta: "76.4%",
      hint: "backlog assigned",
      status: "info" as const,
      sparkline: <Spark pts={[210, 248, 271, 299, 330, 361, 382]} color="#2B6CB0" />,
    },
    {
      label: "Corridor Availability",
      value: "96.4%",
      code: "TRUNK",
      delta: "+3.3 pts",
      hint: "vs manual baseline",
      status: "success" as const,
    },
  ];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="COMMAND CENTER"
        title="Corridor Maintenance Control"
        subtitle={`Real-time decision support for ${runMeta.corridor} · ${runMeta.division}`}
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn-rail btn-rail-secondary"
              onClick={() => go("planning")}
            >
              Planning Setup
            </button>
            <button
              type="button"
              className="btn-rail btn-rail-primary"
              onClick={() => go("schedule")}
            >
              Master Schedule
            </button>
          </div>
        }
      />

      {/* Source Status Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          fontSize: "11px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--navy-secondary)", letterSpacing: "0.04em" }}>
          TELEMETRY STATUS:
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span>
            <strong>TMS:</strong> <StatusBadge status="READY" size="sm" label="18,420 rows · 2m lag" />
          </span>
          <span>
            <strong>SMMS:</strong> <StatusBadge status="READY" size="sm" label="7,420 rows · 1m lag" />
          </span>
          <span>
            <strong>TDMS:</strong> <StatusBadge status="READY" size="sm" label="9,311 rows · 4m lag" />
          </span>
          <span>
            <strong>COA:</strong> <StatusBadge status="READY" size="sm" label="1,288 rows · Live" />
          </span>
        </div>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontFamily: "IBM Plex Mono, monospace" }}>
          Last Cycle: 10:24 IST
        </span>
      </div>

      {/* Compact KPI Strip */}
      <MetricStrip metrics={overviewMetrics} columns={5} />

      {/* MAIN DECISION AREA (Split 68% / 32%) */}
      <div className="grid-68-32">
        {/* Left: High Priority Maintenance Queue */}
        <SectionPanel
          title="High Priority Maintenance Queue"
          subtitle="Backlog defects requiring possession allocation"
          action={
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                Showing 6 urgent items
              </span>
              <button
                type="button"
                className="btn-rail btn-rail-ghost"
                onClick={() => go("tasks")}
              >
                View Full Backlog →
              </button>
            </div>
          }
          noPadding
        >
          <DataTable
            data={highPriorityQueue}
            keyField="id"
            selectedId={selectedTask}
            onRowClick={(row) => setSelectedTask(row.id)}
            columns={[
              {
                header: "Task ID",
                accessor: (r) => <span className="cell-id">{r.id}</span>,
                width: 75,
              },
              {
                header: "Asset",
                accessor: (r) => <strong>{r.asset}</strong>,
                width: 100,
              },
              {
                header: "Location",
                accessor: (r) => <span className="cell-mono" style={{ fontSize: "11px" }}>{r.section}</span>,
                width: 130,
              },
              {
                header: "Maintenance Activity",
                accessor: (r) => (
                  <div>
                    <div>{r.activity}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{r.dept}</div>
                  </div>
                ),
              },
              {
                header: "Priority",
                accessor: (r) => <StatusBadge status={r.pri} size="sm" />,
                width: 85,
              },
              {
                header: "Risk",
                accessor: (r) => <StatusBadge status={r.risk} size="sm" />,
                width: 85,
              },
              {
                header: "Overdue",
                accessor: (r) => (
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: "11px",
                      color: r.risk === "CRITICAL" ? "var(--state-critical)" : "var(--state-warning)",
                      fontWeight: 600,
                    }}
                  >
                    {r.overdue}
                  </span>
                ),
                width: 105,
              },
              {
                header: "Candidate Window",
                accessor: (r) => (
                  <span className="cell-mono" style={{ fontSize: "11px", color: "var(--navy-primary)" }}>
                    {r.window}
                  </span>
                ),
                width: 140,
              },
            ]}
          />
        </SectionPanel>

        {/* Right: RAILOPT Decision Support */}
        <DecisionPanel
          blockId="B04 (Combined)"
          section="S03 (Km 126–131 · TDL)"
          windowSpan="08:00 – 12:00 IST"
          duration="4h 00m (240m)"
          tasks={["T101 (Track)", "T205 (Relay)", "T421 (Bridge)"]}
          trainImpact="0 Rajdhani delays · 2 Freight loops"
          priorityScore={94}
          whyReasons={[
            { text: "Corridor section S03 double-line clear of scheduled passenger trains", verified: true },
            { text: "R12 tamping machine & R04 S&T crew pre-staged at Tundla Junction", verified: true },
            { text: "T101 +4mm track twist resolved prior to monsoon freight window", verified: true },
            { text: "Upstream weld dependency T087 certified complete", verified: true },
            { text: "Goods rake G-441 vacated into siding at 09:40 without train delay", verified: true },
          ]}
          onReview={() => go("schedule")}
          onApprove={() => go("validation")}
          onHold={() => {}}
        />
      </div>

      {/* LOWER OPERATIONS AREA */}
      <div className="grid-3-cols">
        {/* Corridor Availability */}
        <SectionPanel
          title="NDLS–PRYJ Corridor Availability"
          subtitle="Trunk status (Km 0 to 635) · Operational line occupancy"
        >
          <CorridorSchematic
            stations={stations}
            selectedStation={selectedStation}
            onSelectStation={setSelectedStation}
            activeBlockSection="Section S03 (Tundla Jn · Block B04 Active)"
          />
        </SectionPanel>

        {/* Train Impact: Horizontal bars */}
        <SectionPanel
          title="Train Path Impact"
          subtitle="Evaluated against Working Time Table & COA forecast"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "4px 0" }}>
            {trainImpactSummary.map((item) => (
              <div key={item.category} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                  <span style={{ fontWeight: 600, color: "var(--navy-primary)" }}>{item.category}</span>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "11px", color: "var(--text-secondary)" }}>
                    {item.impact}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <Bar value={item.pct} tone={item.status === "PASS" ? "ok" : item.status === "WATCH" ? "info" : "warn"} />
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>
              </div>
            ))}
            <div
              style={{
                marginTop: "4px",
                padding: "6px 8px",
                backgroundColor: "#FAFBFD",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                fontSize: "10.5px",
                color: "var(--text-secondary)",
              }}
            >
              Passenger paths receive absolute priority. Possession windows may not truncate passenger headway below 18 minutes.
            </div>
          </div>
        </SectionPanel>

        {/* Operational Alerts / Control Wire */}
        <SectionPanel
          title="Operational Alerts"
          subtitle="Section telemetry and control log notifications"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {liveFeed.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 48px 1fr",
                  gap: "6px",
                  padding: "4px 0",
                  borderBottom: "1px dashed var(--border-subtle)",
                  fontSize: "11.5px",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10.5px", color: "var(--text-muted)" }}>
                  {item.t}
                </span>
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--navy-secondary)",
                    backgroundColor: "#EBF3FB",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    textAlign: "center",
                  }}
                >
                  {item.src}
                </span>
                <span style={{ color: "var(--text-primary)", lineHeight: 1.3 }}>{item.msg}</span>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      {/* FINAL CONTROL STATUS */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "7px 12px",
          fontSize: "11px",
          color: "var(--text-secondary)",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span>
            Plan Validated: <strong style={{ color: "var(--state-success)" }}>PASS</strong>
          </span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span>
            Resources Passed: <strong style={{ color: "var(--state-success)" }}>PASS</strong>
          </span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span>
            Dependencies Passed: <strong style={{ color: "var(--state-success)" }}>PASS</strong>
          </span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span>
            Conflicts: <strong style={{ color: "var(--navy-primary)" }}>0</strong>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge status="PENDING" label="CONTROLLER SIGN-OFF PENDING" size="sm" />
          <button
            type="button"
            className="btn-rail btn-rail-primary"
            onClick={() => go("validation")}
          >
            Review & Authorize
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================
   2. BLOCK PLANNING
   ==================================================== */
export function Planning({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="rail-section-flat" style={{ gap: "14px" }}>
      <PageHeader
        section="BLOCK PLANNING"
        title="Planning Run Configuration"
        subtitle="Define planning horizon, participating departments and traffic conditions prior to solver run"
        action={
          <button
            type="button"
            className="btn-rail btn-rail-primary size-lg"
            onClick={onGenerate}
          >
            Generate Planning Run RP-2026-091
          </button>
        }
      />

      <div className="grid-55-45">
        {/* Left: Planning Run Configuration */}
        <SectionPanel
          title="Planning Run Configuration"
          subtitle="Operational parameters and boundary conditions"
          accent="navy"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="grid-2-cols">
              <div className="rail-form-group">
                <label className="rail-form-label">Planning Horizon From</label>
                <input className="rail-input" type="date" defaultValue="2026-09-01" />
              </div>
              <div className="rail-form-group">
                <label className="rail-form-label">Planning Horizon To</label>
                <input className="rail-input" type="date" defaultValue="2026-09-07" />
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
              <div className="rail-form-label" style={{ marginBottom: "6px" }}>
                Participating Departments
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {[
                  { name: "Engineering (Civil / Track)", count: "12 gangs staged" },
                  { name: "TRD (Traction / OHE)", count: "8 tower wagons" },
                  { name: "S&T (Signalling & Telecom)", count: "6 tester crews" },
                  { name: "Operating (Station Traffic)", count: "All stations active" },
                ].map((d, i) => (
                  <label key={d.name} className="rail-checkbox-label">
                    <input type="checkbox" defaultChecked={i < 3} />
                    <span>
                      <strong>{d.name}</strong>
                      <span style={{ display: "block", fontSize: "10px", color: "var(--text-muted)" }}>{d.count}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
              <div className="rail-form-label" style={{ marginBottom: "6px" }}>
                Priority Bands
              </div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {["Critical (P1)", "High (P2)", "Medium (P3)", "Low (P4)"].map((p) => (
                  <label key={p} className="rail-checkbox-label">
                    <input type="checkbox" defaultChecked />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
              <div className="rail-form-label" style={{ marginBottom: "6px" }}>
                Passenger Train Protection
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label className="rail-checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>Rajdhani / Shatabdi Express:</strong> Enforce zero-delay buffer (+18 min minimum headway)
                  </span>
                </label>
                <label className="rail-checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>Mail & Express Trains:</strong> Allow maximum 15 min retiming with operating concurrence
                  </span>
                </label>
                <label className="rail-checkbox-label">
                  <input type="checkbox" defaultChecked />
                  <span>
                    <strong>COA Freight Paths:</strong> Dynamic siding looping allowed during daylight possession windows
                  </span>
                </label>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
              <button
                type="button"
                className="btn-rail btn-rail-primary full-width size-lg"
                onClick={onGenerate}
              >
                Generate Planning Run RP-2026-091
              </button>
            </div>
          </div>
        </SectionPanel>

        {/* Right: Source Readiness & Active Parameters */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <SectionPanel
            title="Source Readiness"
            subtitle="Pre-flight data sync status across railway systems"
            noPadding
          >
            <DataTable
              data={sources}
              keyField="id"
              columns={[
                {
                  header: "Source ID",
                  accessor: (s) => <span className="cell-id">{s.id}</span>,
                  width: 75,
                },
                {
                  header: "System Name",
                  accessor: (s) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>{s.records.toLocaleString()} rows</div>
                    </div>
                  ),
                },
                {
                  header: "Ingest Lag",
                  accessor: (s) => <span className="cell-mono" style={{ fontSize: "11px" }}>{s.lag}</span>,
                  width: 80,
                },
                {
                  header: "Validation",
                  accessor: () => <StatusBadge status="READY" size="sm" />,
                  width: 85,
                },
              ]}
            />
          </SectionPanel>

          <SectionPanel
            title="Active Corridor Parameters"
            subtitle="Infrastructure profile for Allahabad (PRYJ) Division"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>CORRIDOR</span>
                <div style={{ fontWeight: 600 }}>{runMeta.corridor}</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TRACK GAUGE</span>
                <div style={{ fontWeight: 600 }}>1676 mm Broad Gauge</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TRACTION</span>
                <div style={{ fontWeight: 600 }}>25 kV AC 50 Hz OHE</div>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>SIGNALLING</span>
                <div style={{ fontWeight: 600 }}>Automatic Block Signalling (ABS)</div>
              </div>
            </div>
          </SectionPanel>
        </div>
      </div>

      {/* Bottom: Recent Planning Runs */}
      <SectionPanel
        title="Recent Planning Runs"
        subtitle="Historical CP-SAT optimization envelopes and execution certificates"
        noPadding
      >
        <DataTable
          data={recentRuns}
          keyField="id"
          columns={[
            {
              header: "Run ID",
              accessor: (r) => <span className="cell-id">{r.id}</span>,
              width: 110,
            },
            {
              header: "Operational Scope",
              accessor: "scope",
            },
            {
              header: "Tasks Considered",
              accessor: (r) => <span className="cell-mono">{r.tasks}</span>,
              width: 120,
            },
            {
              header: "Solver State",
              accessor: (r) => <StatusBadge status={r.state} size="sm" />,
              width: 100,
            },
            {
              header: "Safety Gate",
              accessor: (r) => <StatusBadge status={r.validation} size="sm" />,
              width: 95,
            },
            {
              header: "Authorized By",
              accessor: "user",
              width: 150,
            },
            {
              header: "Timestamp",
              accessor: (r) => <span className="cell-time">{r.date}</span>,
              width: 115,
            },
          ]}
        />
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   3. MAINTENANCE TASKS
   ==================================================== */
export function Tasks() {
  const [q, setQ] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [priFilter, setPriFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sel, setSel] = useState(tasks[0].id);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchQ =
        t.id.toLowerCase().includes(q.toLowerCase()) ||
        t.asset.toLowerCase().includes(q.toLowerCase()) ||
        t.section.toLowerCase().includes(q.toLowerCase()) ||
        t.note.toLowerCase().includes(q.toLowerCase());
      const matchDept = deptFilter === "All" || t.dept === deptFilter;
      const matchPri = priFilter === "All" || t.pri === priFilter;
      const matchSec = sectionFilter === "All" || t.section === sectionFilter;
      const matchStatus = statusFilter === "All" || t.status === statusFilter;
      return matchQ && matchDept && matchPri && matchSec && matchStatus;
    });
  }, [q, deptFilter, priFilter, sectionFilter, statusFilter]);

  const selectedItem = tasks.find((x) => x.id === sel) ?? tasks[0];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="MAINTENANCE TASKS"
        title="Corridor Maintenance Task Backlog"
        subtitle="Unified task registry consolidated from TMS, SMMS and TDMS with candidate window matching"
      />

      {/* Toolbar */}
      <div className="rail-toolbar">
        <input
          type="text"
          className="rail-input search-box"
          placeholder="Filter by Task ID, Asset, Section, defect notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="rail-select"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="All">Department: All</option>
          <option value="Engineering">Engineering</option>
          <option value="TRD">TRD</option>
          <option value="S&T">S&T</option>
        </select>
        <select
          className="rail-select"
          value={priFilter}
          onChange={(e) => setPriFilter(e.target.value)}
        >
          <option value="All">Priority: All</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select
          className="rail-select"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
        >
          <option value="All">Section: All</option>
          <option value="S02">S02</option>
          <option value="S03">S03</option>
          <option value="S04">S04</option>
          <option value="S05">S05</option>
          <option value="S06">S06</option>
          <option value="S07">S07</option>
        </select>
        <select
          className="rail-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">Status: All</option>
          <option value="Planned">Planned</option>
          <option value="Pending">Pending</option>
          <option value="Hold">Hold</option>
        </select>
        <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
          Showing <strong>{filteredTasks.length}</strong> of 500 tasks (47 Critical / Overdue)
        </span>
      </div>

      {/* Main Table: Table-First Design */}
      <DataTable
        data={filteredTasks}
        keyField="id"
        selectedId={sel}
        onRowClick={(r) => setSel(r.id)}
        columns={[
          {
            header: "Task ID",
            accessor: (r) => <span className="cell-id">{r.id}</span>,
            width: 80,
          },
          {
            header: "Department",
            accessor: "dept",
            width: 105,
          },
          {
            header: "Asset",
            accessor: (r) => <strong>{r.asset}</strong>,
            width: 130,
          },
          {
            header: "Section",
            accessor: "section",
            width: 75,
          },
          {
            header: "Chainage",
            accessor: (r) => <span className="cell-mono">{r.km}</span>,
            width: 100,
          },
          {
            header: "Priority",
            accessor: (r) => <StatusBadge status={r.pri} size="sm" />,
            width: 90,
          },
          {
            header: "Duration",
            accessor: (r) => <span className="cell-mono">{r.dur}</span>,
            width: 80,
          },
          {
            header: "Due SLA",
            accessor: "due",
            width: 80,
          },
          {
            header: "Planned Window",
            accessor: (r) => (
              <span className="cell-mono" style={{ color: r.win === "—" ? "var(--text-muted)" : "var(--navy-primary)", fontWeight: 600 }}>
                {r.win}
              </span>
            ),
            width: 110,
          },
          {
            header: "Status",
            accessor: (r) => <StatusBadge status={r.status} size="sm" />,
            width: 90,
          },
        ]}
      />

      {/* Selected Task Details: Three Useful Areas */}
      <div className="grid-3-cols">
        {/* Task Details */}
        <SectionPanel
          title={`${selectedItem.id} · ${selectedItem.asset}`}
          subtitle={`Section ${selectedItem.section} (Km ${selectedItem.km})`}
          accent="navy"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEPARTMENT</span>
              <div style={{ fontWeight: 600 }}>{selectedItem.dept}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>PRIORITY BAND</span>
              <div><StatusBadge status={selectedItem.pri} size="sm" /></div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DURATION</span>
              <div style={{ fontWeight: 600 }}>{selectedItem.dur}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DUE SLA</span>
              <div style={{ fontWeight: 600 }}>{selectedItem.due} 2026</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEPENDS ON</span>
              <div style={{ fontFamily: "IBM Plex Mono, monospace" }}>{selectedItem.dep}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>PACKED WINDOW</span>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--navy-primary)" }}>
                {selectedItem.win}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "8px",
              padding: "6px 8px",
              backgroundColor: "#FAFBFD",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--text-secondary)",
            }}
          >
            <strong>Technical Note:</strong> {selectedItem.note}
          </div>
        </SectionPanel>

        {/* Resources & Candidate Windows */}
        <SectionPanel
          title="Resources & Candidate Windows"
          subtitle="Allocated plant, crews, and corridor slot compatibility"
          accent="warning"
        >
          <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
            CREW / PLANT ALLOCATION:
          </div>
          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
            {selectedItem.res.map((r) => (
              <span
                key={r}
                style={{
                  fontSize: "10.5px",
                  padding: "1px 5px",
                  backgroundColor: "#EBF3FB",
                  border: "1px solid #BCD6F0",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--navy-primary)",
                  fontWeight: 600,
                }}
              >
                {r}
              </span>
            ))}
          </div>

          <div style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "4px" }}>
            CANDIDATE WINDOWS:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            {windows.map((w) => {
              const fits = selectedItem.fit.includes(w.id);
              const clashes = selectedItem.no.includes(w.id);
              return (
                <div
                  key={w.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto",
                    alignItems: "center",
                    gap: "6px",
                    padding: "3px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: "11px",
                  }}
                >
                  <span className="cell-id">{w.id}</span>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                      <span>{w.span}</span>
                      <span style={{ color: "var(--text-muted)" }}>{w.note}</span>
                    </div>
                    <Bar value={w.load} tone={w.tone === "ok" ? "ok" : w.tone === "warn" ? "warn" : "info"} />
                  </div>
                  <StatusBadge
                    status={fits ? "PASS" : clashes ? "CRITICAL" : "HOLD"}
                    label={fits ? "FITS" : clashes ? "CLASH" : "—"}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        </SectionPanel>

        {/* Compatibility Snapshot */}
        <SectionPanel
          title="Compatibility Snapshot"
          subtitle="Cross-department packaging feasibility"
          accent="success"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "7px", fontSize: "11.5px" }}>
            <div
              style={{
                padding: "6px 8px",
                backgroundColor: "#DEF7EC",
                border: "1px solid #BCF0DA",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontWeight: 700, color: "#03543F" }}>✓ T101 + T205 CAN SHARE B04</div>
              <div style={{ fontSize: "10.5px", color: "#046C4E", marginTop: "1px" }}>
                Same section S03 (Km 126–129). Track geometry and relay contacts do not interfere.
              </div>
            </div>

            <div
              style={{
                padding: "6px 8px",
                backgroundColor: "#FDE8E8",
                border: "1px solid #F8B4B4",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontWeight: 700, color: "#9B1C1C" }}>✕ T101 + T314 OHE ISOLATION CLASH</div>
              <div style={{ fontSize: "10.5px", color: "#771D1D", marginTop: "1px" }}>
                T314 drops 25kV power across adjacent km, stopping diesel tamping crane staging.
              </div>
            </div>

            <div
              style={{
                padding: "6px 8px",
                backgroundColor: "#FAFBFD",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)",
                fontSize: "10.5px",
                color: "var(--text-secondary)",
              }}
            >
              Consolidating Civil and S&T tasks into single 4-hour window B04 reduces track occupancy hours by 35%.
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

/* ====================================================
   4. POSSESSION BLOCKS
   ==================================================== */
export function Blocks() {
  const [sel, setSel] = useState("B04");
  const selectedBlock = blocks.find((x) => x.id === sel) ?? blocks[3];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="POSSESSION BLOCKS"
        title="Corridor Possession Windows"
        subtitle="Traffic, Power and Combined blocks offered by Operating Control along the NDLS–CNB trunk corridor"
      />

      <div className="grid-65-35">
        {/* Main: Offered Corridor Blocks Ledger */}
        <SectionPanel
          title="Offered Corridor Blocks Ledger"
          subtitle="Select a block to inspect section boundaries and compatible tasks"
          noPadding
        >
          <DataTable
            data={blocks}
            keyField="id"
            selectedId={sel}
            onRowClick={(r) => setSel(r.id)}
            columns={[
              {
                header: "Block ID",
                accessor: (r) => <span className="cell-id">{r.id}</span>,
                width: 80,
              },
              {
                header: "Section",
                accessor: "section",
                width: 90,
              },
              {
                header: "Block Type",
                accessor: "type",
                width: 95,
              },
              {
                header: "Status",
                accessor: (r) => <StatusBadge status={r.status} size="sm" />,
                width: 90,
              },
              {
                header: "Offered Slot",
                accessor: (r) => <span className="cell-mono">{r.from} – {r.to}</span>,
                width: 115,
              },
              {
                header: "Duration",
                accessor: "dur",
                width: 80,
              },
              {
                header: "Conflicting Trains",
                accessor: (r) => (
                  <span
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontWeight: 700,
                      color: r.trains > 2 ? "var(--state-critical)" : r.trains > 0 ? "var(--state-warning)" : "var(--state-success)",
                    }}
                  >
                    {r.trains} paths
                  </span>
                ),
                width: 115,
              },
            ]}
          />
        </SectionPanel>

        {/* Right: Selected Block */}
        <SectionPanel
          title={`${selectedBlock.id} · ${selectedBlock.type} Block`}
          subtitle={`Status: ${selectedBlock.status.toUpperCase()}`}
          accent="navy"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "10px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>SECTION COVERAGE</span>
              <div style={{ fontWeight: 600 }}>{selectedBlock.section}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>OFFERED SLOT</span>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>
                {selectedBlock.from} – {selectedBlock.to}
              </div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DURATION</span>
              <div style={{ fontWeight: 600 }}>{selectedBlock.dur}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TRAIN IMPACT</span>
              <div style={{ fontWeight: 600 }}>{selectedBlock.trains} conflicting paths</div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", marginBottom: "8px" }}>
            <div className="rail-form-label" style={{ marginBottom: "5px" }}>
              Window Capacity Utilization
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {windows.map((w) => (
                <div key={w.id} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}>
                  <span className="cell-id" style={{ width: "32px" }}>{w.id}</span>
                  <div style={{ flex: 1 }}>
                    <Bar value={w.load} tone={w.tone === "ok" ? "ok" : "warn"} />
                  </div>
                  <span style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: "10.5px", width: "32px", textAlign: "right" }}>
                    {w.load}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px" }}>
            <div className="rail-form-label" style={{ marginBottom: "5px" }}>
              Compatible Backlog Tasks
            </div>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {selectedBlock.fit.length > 0 ? (
                selectedBlock.fit.map((id) => (
                  <span
                    key={id}
                    style={{
                      fontFamily: "IBM Plex Mono, monospace",
                      fontSize: "10.5px",
                      fontWeight: 600,
                      padding: "1px 6px",
                      backgroundColor: "#EBF3FB",
                      border: "1px solid #BCD6F0",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--navy-primary)",
                    }}
                  >
                    {id}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  No candidate tasks matched.
                </span>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>

      {/* Bottom: Corridor Possession Line */}
      <SectionPanel
        title="Corridor Possession Line Representation"
        subtitle="Infrastructure-oriented schematic view showing active block position"
      >
        <CorridorSchematic
          stations={stations}
          activeBlockSection={`Block ${selectedBlock.id} on ${selectedBlock.section}`}
        />
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   5. COORDINATION
   ==================================================== */
export function Compatibility() {
  const [selectedPair, setSelectedPair] = useState<[string, string]>(["T101", "T205"]);

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="COORDINATION"
        title="Multi-Department Compatibility"
        subtitle="Mathematical joint possession rules governing Engineering, TRD and S&T co-occupancy of track windows"
      />

      <div className="grid-65-35">
        {/* Main: Pairwise Compatibility Matrix */}
        <SectionPanel
          title="Pairwise Compatibility Matrix"
          subtitle="Click on any cell to evaluate cross-department packaging rules"
          accent="navy"
        >
          <div style={{ overflowX: "auto" }}>
            <table className="compat-matrix-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }} />
                  {matrixIds.map((id) => (
                    <th key={id}>{id}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={matrixIds[i]}>
                    <th>{matrixIds[i]}</th>
                    {row.map((cell, j) => {
                      const cellClass =
                        cell === "ok"
                          ? "cell-ok"
                          : cell === "no"
                          ? "cell-no"
                          : cell === "maybe"
                          ? "cell-maybe"
                          : "cell-self";
                      return (
                        <td
                          key={j}
                          className={`compat-cell ${cellClass}`}
                          onClick={() => {
                            if (cell !== "self") {
                              setSelectedPair([matrixIds[i], matrixIds[j]]);
                            }
                          }}
                          title={`Task ${matrixIds[i]} & Task ${matrixIds[j]}: ${cell.toUpperCase()}`}
                        >
                          {cell === "ok" ? "✓" : cell === "no" ? "✕" : cell === "maybe" ? "?" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "var(--state-success)", fontWeight: 700 }}>✓ COMPATIBLE:</span>
              <span>Same chainage, safe electrical clearance, non-conflicting gangs</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "var(--state-warning)", fontWeight: 700 }}>? CONDITIONAL:</span>
              <span>Requires additional OHE isolation or speed restriction</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "var(--state-critical)", fontWeight: 700 }}>✕ CONFLICT:</span>
              <span>Hard physical interference or safety violation</span>
            </div>
          </div>
        </SectionPanel>

        {/* Right: Selected Pair Analysis */}
        <SectionPanel
          title={`${selectedPair[0]} + ${selectedPair[1]}`}
          subtitle="Compatibility Evaluation & Feasibility Score"
          accent="success"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "#DEF7EC",
              border: "1px solid #BCF0DA",
              borderRadius: "var(--radius-sm)",
              padding: "6px 10px",
              marginBottom: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#03543F" }}>FEASIBILITY SCORE</div>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "#03543F" }}>92 / 100</div>
            </div>
            <StatusBadge status="COMPATIBLE" label="HIGHLY FEASIBLE" size="md" />
          </div>

          <div className="rail-form-label" style={{ marginBottom: "5px" }}>
            Rule Ledger
          </div>
          <ul className="why-checklist" style={{ marginBottom: "12px" }}>
            {combineReasons.map((r, idx) => (
              <li key={idx} className={r.ok ? "verified" : "unverified"}>
                <span className="check-icon">{r.ok ? "✓" : "✕"}</span>
                <span className="check-text">{r.text}</span>
              </li>
            ))}
          </ul>

          <div
            style={{
              padding: "8px 10px",
              backgroundColor: "#EBF3FB",
              border: "1px solid #BCD6F0",
              borderRadius: "var(--radius-sm)",
              fontSize: "11.5px",
              color: "var(--navy-primary)",
              lineHeight: 1.4,
              marginBottom: "10px",
            }}
          >
            <strong>Controller Recommendation:</strong> Consolidate both tasks into Combined Block B04 (Window W17). Saves 90 minutes of total corridor occupancy with zero passenger train delays.
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <button type="button" className="btn-rail btn-rail-primary full-width">
              Approve Coordinated Pairing
            </button>
            <button type="button" className="btn-rail btn-rail-secondary">
              Review
            </button>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

/* ====================================================
   6. OPTIMIZER
   ==================================================== */
export function Optimizer({ done, run }: { done: boolean; run: () => void }) {
  const optimizerMetrics = [
    { label: "Tasks Considered", value: "500", code: "BACKLOG", status: "neutral" as const },
    { label: "Candidate Assignments", value: "742", code: "DOMAINS", status: "neutral" as const },
    { label: "Compatible Combinations", value: "186", code: "PAIRS", status: "info" as const },
    { label: "Hard Constraints", value: "1,284", code: "INGESTED", status: "neutral" as const },
  ];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="OPTIMIZATION"
        title="CP-SAT Optimization Run"
        subtitle="Constrained integer programming engine for multi-objective possession scheduling and conflict resolution"
        action={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <StatusBadge
              status={done ? "OPTIMAL" : "READY"}
              label={done ? "FEASIBLE · 2.84s (GAP 0.4%)" : "READY TO SOLVE"}
              size="md"
            />
            <button
              type="button"
              className="btn-rail btn-rail-primary size-lg"
              onClick={run}
            >
              {done ? "Re-Run CP-SAT Solver" : "Run CP-SAT Optimizer"}
            </button>
          </div>
        }
      />

      <MetricStrip metrics={optimizerMetrics} columns={4} />

      {/* Solver Parameters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 12px",
          fontSize: "11px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <span><strong>Engine:</strong> Google OR-Tools CP-SAT v9.8</span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span><strong>Threads:</strong> 8 Search Workers</span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span><strong>Max Wall Time:</strong> 10.0s limit</span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span><strong>Target Optimality Gap:</strong> &lt; 1.0%</span>
        </div>
        <span style={{ color: "var(--navy-secondary)", fontWeight: 600 }}>
          Deterministic Seed: 20260927
        </span>
      </div>

      {/* Central Area */}
      <div className="grid-3-cols">
        {/* Objective Metric Breakdown */}
        <SectionPanel
          title="Objective Metric Breakdown"
          subtitle="Weights achieved against priority criteria"
          accent="navy"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "2px 0" }}>
            {objectives.map((o) => {
              const val = typeof o.value === "number" ? o.value : 0;
              const isZeroBetter = o.label.includes("Conflicts") || o.label.includes("Late");
              return (
                <div key={o.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.label}</span>
                    <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--navy-primary)" }}>
                      {o.value}{o.unit}
                    </span>
                  </div>
                  <Bar
                    value={o.unit === "%" ? val : isZeroBetter ? (val === 0 ? 100 : 30) : Math.min(100, val * 2)}
                    tone={isZeroBetter ? (val === 0 ? "ok" : "danger") : val >= 80 ? "ok" : "warn"}
                  />
                </div>
              );
            })}
          </div>
        </SectionPanel>

        {/* Solver Event Log */}
        <SectionPanel
          title="Solver Event Log"
          subtitle="Real-time multi-threaded branch-and-cut progress"
          accent="warning"
        >
          <div
            style={{
              backgroundColor: "#0B1E36",
              color: "#C3D5E6",
              padding: "8px 10px",
              borderRadius: "var(--radius-sm)",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: "10.5px",
              lineHeight: 1.45,
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              minHeight: "210px",
            }}
          >
            {(done ? solverLog : solverLog.slice(0, 3)).map((s, idx) => (
              <div key={idx} style={{ display: "flex", gap: "6px" }}>
                <span style={{ color: "#64B5F6" }}>[{s.t}]</span>
                <span style={{ color: "#FFFFFF" }}>{s.text}</span>
              </div>
            ))}
            {!done && (
              <div style={{ color: "#D9822B", marginTop: "6px" }}>
                &gt; Model primed. Press "Run CP-SAT Optimizer" to execute mathematical packing.
              </div>
            )}
          </div>
        </SectionPanel>

        {/* Current Incumbent / Solution State */}
        <SectionPanel
          title="Current Incumbent State"
          subtitle="Certified solution candidate for Section Controller review"
          accent={done ? "success" : "none"}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 12px",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: done ? "#DEF7EC" : "#FEF3C7",
                border: `2.5px solid ${done ? "var(--state-success)" : "var(--state-warning)"}`,
                color: done ? "var(--state-success)" : "var(--state-warning)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
                fontWeight: 700,
              }}
            >
              {done ? "✓" : "⏳"}
            </div>

            <div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: done ? "var(--state-success)" : "var(--navy-primary)",
                }}
              >
                {done ? "FEASIBLE SOLUTION LOCKED" : "WAITING FOR SOLVE"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {done
                  ? "382 tasks scheduled · 0 hard conflicts · 2.84s runtime"
                  : "Solver model initialized with 500 tasks and 86 offered block windows"}
              </div>
            </div>

            <div style={{ width: "100%", borderTop: "1px solid var(--border-subtle)", paddingTop: "10px", marginTop: "4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                <span>Run Reference:</span>
                <span className="cell-id">{runMeta.id}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span>Optimality Gap:</span>
                <span className="cell-mono">{done ? "0.4%" : "—"}</span>
              </div>
            </div>

            {done && (
              <button
                type="button"
                className="btn-rail btn-rail-primary full-width"
                onClick={() => {}}
              >
                Commit Solution to Schedule
              </button>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

/* ====================================================
   7. SCHEDULE / GANTT
   ==================================================== */
export function Schedule() {
  const [selectedGanttTask, setSelectedGanttTask] = useState("T101");

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="SCHEDULE"
        title="Operational Maintenance Schedule"
        subtitle={`Weekly synchronized maintenance windows on ${runMeta.corridor} with protected passenger paths`}
        action={
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" className="btn-rail btn-rail-secondary">
              Export BDMS Format
            </button>
            <button type="button" className="btn-rail btn-rail-primary">
              Issue Corridor Release
            </button>
          </div>
        }
      />

      {/* Top Controls & Legend Strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#FFFFFF",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)",
          padding: "7px 12px",
          fontSize: "11.5px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span><strong>Horizon:</strong> 01 Sep 2026 – 07 Sep 2026 (7 Days)</span>
          <span className="v-divider" style={{ height: "12px" }} />
          <span><strong>Corridor:</strong> NDLS–CNB (Km 0 to 441)</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "9px", backgroundColor: "#12345B", borderRadius: "2px" }} />
            <span>Engineering</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "9px", backgroundColor: "#16834B", borderRadius: "2px" }} />
            <span>S&T</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ width: "10px", height: "9px", backgroundColor: "#A86A00", borderRadius: "2px" }} />
            <span>TRD</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#2B6CB0", fontWeight: 700 }}>◆</span>
            <span>Train Movement</span>
          </div>
        </div>
      </div>

      {/* Main Gantt + Scheduling Rationale */}
      <div className="grid-68-32">
        {/* Main Gantt Viewport */}
        <SectionPanel
          title="Section & Block Gantt (01–07 Sep 2026)"
          subtitle="Bars indicate allocated possessions; diamond markers denote scheduled train paths"
          noPadding
        >
          <div className="rail-gantt-wrapper">
            <div className="gantt-header-row">
              <div className="gantt-header-col">SECTION / BLOCK</div>
              <div className="gantt-timeline-ticks">
                {weekDays.map((d) => (
                  <div key={d} className="gantt-tick">
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {gantt.map((row) => (
              <div key={row.section} className="gantt-section-row">
                <div className="gantt-section-label">
                  <span className="gantt-sec-code">{row.section}</span>
                  <span className="gantt-sec-block">Block {row.block}</span>
                </div>
                <div className="gantt-lane">
                  {row.items.map((it) => (
                    <div
                      key={it.id}
                      className={`gantt-bar-item dept-${it.kind}`}
                      style={{
                        left: `${it.start}%`,
                        width: `${it.span}%`,
                      }}
                      onClick={() => setSelectedGanttTask(it.id)}
                      title={`Task ${it.id} · Department ${it.kind.toUpperCase()}`}
                    >
                      {it.id}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Train Movement Track */}
            <div className="gantt-train-track">
              {trains.map((t) => (
                <div
                  key={t.id}
                  className="train-marker"
                  style={{ left: `${t.at}%` }}
                  title={`Train ${t.id} (${t.name})`}
                >
                  {t.id}
                </div>
              ))}
            </div>
          </div>
        </SectionPanel>

        {/* Right Side: Scheduling Rationale */}
        <SectionPanel
          title="Scheduling Rationale"
          subtitle={`Task ${whyT101.task} Selection Audit`}
          accent="navy"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "8px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>ASSIGNED WINDOW</span>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--navy-primary)" }}>
                {whyT101.window}
              </div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>OPTIMIZATION SCORE</span>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--state-success)" }}>
                {whyT101.score} / 100
              </div>
            </div>
          </div>

          <div className="rail-form-label" style={{ marginBottom: "5px" }}>
            Why Selected
          </div>
          <ul className="why-checklist" style={{ marginBottom: "10px" }}>
            {whyT101.bullets.map((b, idx) => (
              <li key={idx} className="verified">
                <span className="check-icon">✓</span>
                <span className="check-text">{b}</span>
              </li>
            ))}
          </ul>

          <div
            style={{
              padding: "6px 8px",
              backgroundColor: "#FAFBFD",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.35,
            }}
          >
            <strong>Alternative Rejected:</strong> Window {whyT101.alt}: {whyT101.altDrop}
          </div>
        </SectionPanel>
      </div>

      {/* Manual Baseline vs RAILOPT Comparison */}
      <SectionPanel
        title="Manual Baseline vs RAILOPT Pack"
        subtitle="Performance validation across identical corridor backlog and train schedule"
        noPadding
      >
        <DataTable
          data={kpiCompare}
          keyField="metric"
          columns={[
            {
              header: "Corridor Metric",
              accessor: (r) => <strong>{r.metric}</strong>,
            },
            {
              header: "Manual Controller Baseline",
              accessor: (r) => <span className="cell-mono">{r.base}</span>,
              width: 170,
            },
            {
              header: "RAILOPT Optimized Pack",
              accessor: (r) => (
                <span className="cell-mono" style={{ fontWeight: 700, color: "var(--navy-primary)" }}>
                  {r.opt}
                </span>
              ),
              width: 170,
            },
            {
              header: "Improvement",
              accessor: (r) => (
                <span style={{ fontWeight: 700, color: "var(--state-success)" }}>
                  {r.gain}
                </span>
              ),
              width: 170,
            },
          ]}
        />
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   8. ANALYTICS
   ==================================================== */
export function Analytics() {
  const analyticsMetrics = [
    { label: "Possessions Scheduled", value: "78 / 86", code: "90.7% YIELD", status: "success" as const },
    { label: "Corridor Minutes Saved", value: "485 min", code: "DELAY REDUCTION", status: "success" as const },
    { label: "Cross-Department Pairs", value: "18", code: "COORDINATED", status: "info" as const },
    { label: "Hard Conflicts Avoided", value: "6", code: "CLEARED", status: "success" as const },
  ];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="ANALYTICS"
        title="Corridor Productivity & Possession Utilization"
        subtitle="Empirical performance indicators, asset completion rates and inter-departmental coordination on NDLS–CNB trunk corridor"
      />

      <MetricStrip metrics={analyticsMetrics} columns={4} />

      <div className="grid-3-cols">
        {/* Maintenance Completion by Dept */}
        <SectionPanel
          title="Maintenance Completion"
          subtitle="Actual backlog progress this horizon"
          accent="navy"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "6px 0" }}>
            {deptBars.map((d) => (
              <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span className="cell-mono">{d.pct}% ({d.value} tasks)</span>
                </div>
                <Bar value={d.pct} tone={d.pct >= 70 ? "ok" : d.pct >= 50 ? "info" : "warn"} />
              </div>
            ))}
          </div>
        </SectionPanel>

        {/* Possession Utilization (Single clean donut, max 1) */}
        <SectionPanel
          title="Possession Utilization"
          subtitle="Total 86 offered windows on corridor"
          accent="success"
        >
          <Donut
            segments={utilization.map((u) => ({ value: u.value, color: u.color }))}
            center="63%"
            label="OCCUPIED"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: "10px",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "10.5px",
            }}
          >
            {utilization.map((u) => (
              <div key={u.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: u.color }} />
                <span>{u.label}: <strong>{u.value}%</strong></span>
              </div>
            ))}
          </div>
        </SectionPanel>

        {/* Cross-Department Coordination Heatmap */}
        <SectionPanel
          title="Cross-Department Coordination"
          subtitle="Shared possession slots executed per day"
          accent="warning"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "55px repeat(7, 1fr)",
                gap: "3px",
                fontSize: "9.5px",
                fontWeight: 700,
                color: "var(--text-secondary)",
                textAlign: "center",
              }}
            >
              <span />
              {weekDays.map((d) => (
                <span key={d}>{d.split(" ")[1]}</span>
              ))}
            </div>
            {["ENGG", "TRD", "S&T"].map((dept, i) => (
              <div
                key={dept}
                style={{
                  display: "grid",
                  gridTemplateColumns: "55px repeat(7, 1fr)",
                  gap: "3px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--navy-primary)" }}>{dept}</span>
                {heat[i].map((v, j) => {
                  const bg =
                    v >= 5 ? "#12345B" : v >= 4 ? "#234B76" : v >= 3 ? "#4572A2" : v >= 2 ? "#88AECF" : "#D2E2F0";
                  const textColor = v >= 3 ? "#FFFFFF" : "#172033";
                  return (
                    <div
                      key={j}
                      style={{
                        height: "22px",
                        backgroundColor: bg,
                        color: textColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: 600,
                        borderRadius: "2px",
                        fontFamily: "IBM Plex Mono, monospace",
                      }}
                      title={`${dept} Day ${j + 1}: ${v} shared possessions`}
                    >
                      {v}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      {/* Plant / Crew Utilization */}
      <SectionPanel
        title="Specialized Plant & Crew Utilization"
        subtitle="Mechanized equipment capacity on Allahabad Division"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
          {resources.map((r) => (
            <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px" }}>
                <span>
                  <strong className="cell-id">{r.id}</strong> {r.name}
                </span>
                <span className="cell-mono">{r.use}%</span>
              </div>
              <Bar value={r.use} tone={r.use > 80 ? "warn" : "ok"} />
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   9. REPLANNING
   ==================================================== */
export function Replanning({ done, run }: { done: boolean; run: () => void }) {
  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="REPLANNING"
        title="Emergency Replanning"
        subtitle="Dynamic local re-optimization triggered by unscheduled track or signal failure notifications"
        action={
          <StatusBadge
            status={done ? "COMMITTED" : "CRITICAL"}
            label={done ? "REPLAN CERTIFIED & COMMITTED" : "UNPLANNED DEFECT ACTIVE"}
            size="md"
          />
        }
      />

      {/* Process Stepper */}
      <div className="rail-stepper-banner">
        <div className="step-node completed">
          <span className="step-number">1</span>
          <span className="step-label">DEFECT DETECTED</span>
        </div>
        <span className="step-separator">→</span>
        <div className="step-node completed">
          <span className="step-number">2</span>
          <span className="step-label">IMPACT LOCALIZATION</span>
        </div>
        <span className="step-separator">→</span>
        <div className={`step-node ${done ? "completed" : "active"}`}>
          <span className="step-number">3</span>
          <span className="step-label">LOCAL CP-SAT RE-PACK</span>
        </div>
        <span className="step-separator">→</span>
        <div className={`step-node ${done ? "completed" : ""}`}>
          <span className="step-number">4</span>
          <span className="step-label">SAFETY GATE</span>
        </div>
        <span className="step-separator">→</span>
        <div className={`step-node ${done ? "completed" : ""}`}>
          <span className="step-number">5</span>
          <span className="step-label">CONTROLLER SIGN-OFF</span>
        </div>
      </div>

      {/* Three Columns */}
      <div className="grid-3-cols">
        {/* Incident Dossier */}
        <SectionPanel
          title="Incident Dossier"
          subtitle="Defect A37 · SMMS Ingest"
          accent="critical"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "10px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>FAILED ASSET</span>
              <div style={{ fontWeight: 700 }}>A37 Axle Counter</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>SECTION</span>
              <div style={{ fontWeight: 600 }}>S07 (Km 440 · Kanpur)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEPARTMENT</span>
              <div style={{ fontWeight: 600 }}>S&T</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>SEVERITY</span>
              <div><StatusBadge status="CRITICAL" size="sm" /></div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TIMESTAMP</span>
              <div className="cell-time">12 Sep · 10:18 IST</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>OPERATIONAL IMPACT</span>
              <div style={{ color: "var(--state-critical)", fontWeight: 700 }}>Home Signal at ON</div>
            </div>
          </div>

          <div
            style={{
              padding: "6px 8px",
              backgroundColor: "#FDE8E8",
              border: "1px solid #F8B4B4",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "#9B1C1C",
              marginBottom: "10px",
            }}
          >
            Trains cannot enter Section S07 on automatic signal. Track capacity reduced by 60% until coil replacement possession is granted.
          </div>

          <button
            type="button"
            className="btn-rail btn-rail-danger full-width size-lg"
            onClick={run}
          >
            {done ? "Defect A37 Repacked" : "Replan Around Defect A37"}
          </button>
        </SectionPanel>

        {/* What Moves / Minimal Perturbation */}
        <SectionPanel
          title="What Moves"
          subtitle="Minimal perturbation ripple analysis"
          accent="warning"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "11.5px", marginBottom: "10px" }}>
            <div style={{ backgroundColor: "#F8FAFC", padding: "5px 7px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "9.5px" }}>TASKS RETIMED</span>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--state-warning)" }}>7</div>
            </div>
            <div style={{ backgroundColor: "#F8FAFC", padding: "5px 7px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "9.5px" }}>EMERGENCY INSERT</span>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy-primary)" }}>T498 (S&T)</div>
            </div>
            <div style={{ backgroundColor: "#F8FAFC", padding: "5px 7px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "9.5px" }}>WINDOWS SHIFTED</span>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--navy-primary)" }}>2 (W33, W40)</div>
            </div>
            <div style={{ backgroundColor: "#F8FAFC", padding: "5px 7px", borderRadius: "var(--radius-sm)" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "9.5px" }}>UNTOUCHED TASKS</span>
              <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--state-success)" }}>41 (85%)</div>
            </div>
          </div>

          <div
            style={{
              padding: "6px 8px",
              backgroundColor: "#FAFBFD",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)",
              fontSize: "11px",
              color: "var(--text-secondary)",
              lineHeight: 1.35,
            }}
          >
            <strong>Local Strategy:</strong> Task T421 slides to Window W40 to grant S&T daylight slot on S07. All 12 scheduled Rajdhani and Mail/Express paths are held untouched without delay.
          </div>
        </SectionPanel>

        {/* Revised Release & Controller Gate */}
        <SectionPanel
          title="Revised Release"
          subtitle="Controller authorization gate"
          accent={done ? "success" : "none"}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span>Validation Check:</span>
              <StatusBadge status={done ? "PASS" : "PENDING"} label={done ? "ALL CHECKS PASSED" : "AWAITING ACTION"} size="sm" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span>Revision Reference:</span>
              <span className="cell-id">RP-2026-091-REV1</span>
            </div>

            <div
              style={{
                padding: "8px 10px",
                backgroundColor: done ? "#DEF7EC" : "#FAFBFD",
                border: `1px solid ${done ? "#BCF0DA" : "var(--border-default)"}`,
                borderRadius: "var(--radius-sm)",
                fontSize: "11px",
                color: done ? "#03543F" : "var(--text-secondary)",
                marginTop: "2px",
              }}
            >
              {done
                ? "✓ Replanning complete. Section Controller PRYJ-DOM authenticated. Revised possession order pushed to BDMS."
                : "Notice: Algorithmic replanning generated. Section Controller sign-off is mandatory before possession order is transmitted to station masters."}
            </div>

            <button
              type="button"
              className="btn-rail btn-rail-primary full-width size-lg"
              disabled={done}
              onClick={run}
            >
              {done ? "Plan Committed to BDMS" : "Authorize & Commit Revised Plan"}
            </button>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

/* ====================================================
   10. VALIDATION
   ==================================================== */
export function Validation() {
  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="VALIDATION"
        title="Safety & Operating Gate Validation"
        subtitle="Pre-execution compliance verification against Working Time Table, traction isolation and gang safety rules"
        action={<StatusBadge status="PASS" label="6 OF 6 GATES PASSED" size="md" />}
      />

      <div className="grid-65-35">
        {/* Main: Automated Compliance Checks */}
        <SectionPanel
          title="Configured Safety and Operating Checks"
          subtitle="Automated inspection filters applied prior to corridor release"
          accent="navy"
          noPadding
        >
          <DataTable
            data={validation}
            keyField="name"
            columns={[
              {
                header: "Check Rule",
                accessor: (v) => <strong>{v.name}</strong>,
                width: 210,
              },
              {
                header: "Inspection Detail",
                accessor: (v) => (
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                    {v.detail}
                  </span>
                ),
              },
              {
                header: "Verification",
                accessor: () => <StatusBadge status="PASS" size="sm" />,
                width: 90,
              },
            ]}
          />
        </SectionPanel>

        {/* Right: Plan Validation Status */}
        <SectionPanel
          title="Plan Validation Status"
          subtitle="Pre-release verification summary"
          accent="success"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px 12px",
              textAlign: "center",
              gap: "8px",
            }}
          >
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                backgroundColor: "#DEF7EC",
                border: "2.5px solid var(--state-success)",
                color: "var(--state-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                fontWeight: 700,
              }}
            >
              ✓
            </div>

            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.05em", color: "#03543F" }}>
                PLAN VALID
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
                Planning Run: <strong>{runMeta.id}</strong> · {runMeta.division}
              </div>
            </div>

            <div
              style={{
                width: "100%",
                backgroundColor: "#FAFBFD",
                border: "1px dashed var(--border-default)",
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "10.5px",
                color: "var(--text-secondary)",
                marginTop: "4px",
              }}
            >
              All configured checks passed. Section Controller sign-off is required before possession execution.
            </div>

            <button type="button" className="btn-rail btn-rail-primary full-width size-lg">
              Authorize BDMS Disconnection Order
            </button>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}

/* ====================================================
   11. DATA INTEGRATION
   ==================================================== */
export function Integration() {
  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="DATA INTEGRATION"
        title="Multi-Source Railway Data Integration"
        subtitle="Consolidating siloed operational databases into a single corridor PostgreSQL model"
        action={<StatusBadge status="CONNECTED" label="PIPELINE OPERATIONAL" size="md" />}
      />

      {/* Pipeline Flow */}
      <SectionPanel
        title="Corridor Data Pipeline"
        subtitle="End-to-end data transformation from division silos to central solver model"
        accent="navy"
      >
        <div className="pipeline-flow">
          {sources.slice(0, 4).map((s) => (
            <div key={s.id} className="pipeline-node">
              <div className="node-title">{s.id}</div>
              <div className="node-desc">{s.name}</div>
              <div style={{ marginTop: "4px" }}>
                <StatusBadge status="SYNCED" label={`${s.records.toLocaleString()} rows`} size="sm" />
              </div>
            </div>
          ))}
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-node central-stage">
            <div className="node-title">Normalization & QC</div>
            <div className="node-desc">Schema mapping, deduplication & keys</div>
            <div style={{ marginTop: "4px" }}>
              <StatusBadge status="PASS" label="0 Anomalies" size="sm" />
            </div>
          </div>
          <div className="pipeline-arrow">→</div>
          <div className="pipeline-node target-db">
            <div className="node-title">Planning Database</div>
            <div className="node-desc">Unified CP-SAT schema</div>
            <div style={{ marginTop: "4px" }}>
              <StatusBadge status="READY" label="RP-2026-091" size="sm" />
            </div>
          </div>
        </div>
      </SectionPanel>

      {/* Feed Health Table */}
      <SectionPanel
        title="Feed Health & Latency Monitor"
        subtitle="Real-time telemetry status across division adapters"
        noPadding
      >
        <DataTable
          data={sources}
          keyField="id"
          columns={[
            {
              header: "Source ID",
              accessor: (s) => <span className="cell-id">{s.id}</span>,
              width: 85,
            },
            {
              header: "Source Name",
              accessor: (s) => <strong>{s.name}</strong>,
            },
            {
              header: "Records",
              accessor: (s) => <span className="cell-mono">{s.records.toLocaleString()}</span>,
              width: 120,
            },
            {
              header: "Lag",
              accessor: (s) => <span className="cell-mono">{s.lag}</span>,
              width: 100,
            },
            {
              header: "Status",
              accessor: () => <StatusBadge status="CONNECTED" size="sm" />,
              width: 100,
            },
          ]}
        />
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   12. DATA QUALITY
   ==================================================== */
export function Quality() {
  const qualityMetrics = [
    { label: "Total Records", value: "500", code: "TMS + SMMS + TDMS", status: "neutral" as const },
    { label: "Solver-Ready", value: "500", code: "VALID (100%)", status: "success" as const },
    { label: "Quarantined / Invalid", value: "0", code: "ZERO DEFECTS", status: "success" as const },
    { label: "Last QC Pass", value: "10:21 IST", code: "AUTOMATED", status: "info" as const },
  ];

  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="DATA QUALITY"
        title="Solver Ingest Data Quality"
        subtitle="Automated integrity and relational checks preventing solver infeasibility or scheduling anomalies"
        action={<StatusBadge status="PASS" label="DATA QUALITY 100%" size="md" />}
      />

      <MetricStrip metrics={qualityMetrics} columns={4} />

      {/* Issue Ledger */}
      <SectionPanel
        title="Data Integrity Issue Ledger"
        subtitle="Automated gate checks applied to each batch prior to solver consumption"
        noPadding
      >
        <DataTable
          data={qualityChecks}
          keyField="name"
          columns={[
            {
              header: "Quality Check Rule",
              accessor: (q) => <strong>{q.name}</strong>,
            },
            {
              header: "Anomalies",
              accessor: (q) => (
                <span
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontWeight: 700,
                    color: q.count === 0 ? "var(--state-success)" : "var(--state-critical)",
                  }}
                >
                  {q.count} issues
                </span>
              ),
              width: 140,
            },
            {
              header: "Status",
              accessor: (q) => (
                <StatusBadge
                  status={q.count === 0 ? "PASS" : "CRITICAL"}
                  label={q.count === 0 ? "PASS" : "QUARANTINE"}
                  size="sm"
                />
              ),
              width: 110,
            },
          ]}
        />
      </SectionPanel>
    </div>
  );
}

/* ====================================================
   13. SETTINGS
   ==================================================== */
export function Settings() {
  return (
    <div className="rail-section-flat" style={{ gap: "12px" }}>
      <PageHeader
        section="SETTINGS"
        title="Control Room Configuration"
        subtitle="Operational parameters and notification thresholds for Northern Railway, Allahabad Division"
      />

      <div className="grid-2-cols">
        {/* OPERATIONAL WORKSPACE */}
        <SectionPanel
          title="Operational Workspace"
          subtitle="Division jurisdiction and solver binding"
          accent="navy"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>ZONAL RAILWAY</span>
              <div style={{ fontWeight: 600 }}>Northern Railway (NR)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DIVISION</span>
              <div style={{ fontWeight: 600 }}>Allahabad (Prayagraj - PRYJ)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>ASSIGNED CORRIDOR</span>
              <div style={{ fontWeight: 600 }}>NDLS–CNB–PRYJ Trunk</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEFAULT USER ROLE</span>
              <div style={{ fontWeight: 600 }}>Section Controller / Sr. DOM</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>OPTIMIZATION SOLVER</span>
              <div style={{ fontWeight: 600 }}>Google OR-Tools CP-SAT (v9.8)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DATABASE</span>
              <div style={{ fontWeight: 600 }}>PostgreSQL 16 (Corridor Model)</div>
            </div>
          </div>
        </SectionPanel>

        {/* ALERT ROUTING & THRESHOLDS */}
        <SectionPanel
          title="Alert Routing & Thresholds"
          subtitle="Trigger criteria for controller notices"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label className="rail-checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>
                <strong>Critical SLA Breaches:</strong> Notify when P1 task reaches &lt; 36 hours to deadline
              </span>
            </label>
            <label className="rail-checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>
                <strong>Passenger Path Changes:</strong> Trigger replanning alert when Rajdhani / Shatabdi path moves &gt; 5 min
              </span>
            </label>
            <label className="rail-checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>
                <strong>Solver Improvement Notices:</strong> Notify Section Controller when improved schedule is found
              </span>
            </label>
            <label className="rail-checkbox-label">
              <input type="checkbox" defaultChecked />
              <span>
                <strong>Audit Compliance Logging:</strong> Record all controller actions in local audit ledger
              </span>
            </label>
          </div>
        </SectionPanel>

        {/* PLANNING DEFAULTS */}
        <SectionPanel
          title="Planning Defaults"
          subtitle="Pre-configured values for new planning runs"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEFAULT HORIZON</span>
              <div style={{ fontWeight: 600 }}>7 Days (Weekly Cycle)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DEPARTMENTS</span>
              <div style={{ fontWeight: 600 }}>Engineering, TRD, S&T</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>PRIORITY BANDS</span>
              <div style={{ fontWeight: 600 }}>P1 Critical, P2 High, P3 Medium, P4 Low</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>PASSENGER BUFFER</span>
              <div style={{ fontWeight: 600 }}>Strict (+18 min minimum headway)</div>
            </div>
          </div>
        </SectionPanel>

        {/* CONTROLLER PREFERENCES */}
        <SectionPanel
          title="Controller Preferences"
          subtitle="Display density and workstation settings"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11.5px" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>NOTIFICATION LEVEL</span>
              <div style={{ fontWeight: 600 }}>Urgent & Critical Only</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>AUTO-REFRESH</span>
              <div style={{ fontWeight: 600 }}>Every 60 seconds (Live feeds)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>TIME FORMAT</span>
              <div style={{ fontWeight: 600 }}>24-Hour (IST)</div>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>DISPLAY DENSITY</span>
              <div style={{ fontWeight: 600 }}>Compact (Operational)</div>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
