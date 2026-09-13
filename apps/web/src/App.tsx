import { useState, type FormEvent } from "react";
import { AppShell, type NavView } from "./components/rail";
import {
  Analytics,
  Blocks,
  Compatibility,
  Integration,
  Optimizer,
  Overview,
  Planning,
  Quality,
  Replanning,
  Schedule,
  Settings,
  Tasks,
  Validation,
} from "./screens";

const pageTitles: Record<NavView, string> = {
  overview: "Corridor Maintenance Control",
  planning: "Planning Run Configuration",
  tasks: "Corridor Maintenance Task Backlog",
  blocks: "Corridor Possession Windows",
  compatibility: "Multi-Department Compatibility",
  optimizer: "CP-SAT Optimization Run",
  schedule: "Operational Maintenance Schedule",
  analytics: "Corridor Productivity & Possession Utilization",
  replanning: "Emergency Replanning",
  validation: "Safety & Operating Gate Validation",
  integration: "Multi-Source Railway Data Integration",
  quality: "Solver Ingest Data Quality",
  settings: "Control Room Configuration",
};

function Login({ onIn }: { onIn: () => void }) {
  const [err, setErr] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const user = (form.elements.namedItem("user") as HTMLInputElement).value.trim();
    const pass = (form.elements.namedItem("pass") as HTMLInputElement).value.trim();
    if (!user || !pass) {
      setErr("Enter Section Controller credentials to access the simulation environment.");
      return;
    }
    onIn();
  }

  return (
    <div className="rail-login-screen">
      <div className="rail-login-box">
        <div className="login-header-band">
          <div className="login-emblem-row">
            <div className="login-emblem">IR</div>
            <div>
              <div className="login-app-title">RAILOPT</div>
              <div className="login-app-sub">Automatic Maintenance Block Planning</div>
            </div>
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
            Northern Railway · Allahabad (PRYJ) Division · NDLS–CNB Corridor
          </div>
          <div className="login-demo-flag">
            DEMO / SIMULATION ENVIRONMENT (SYNTHETIC SCENARIO)
          </div>
        </div>

        <form className="login-form-body" onSubmit={submit}>
          <div className="login-field">
            <label htmlFor="user">Controller ID / Username</label>
            <input
              id="user"
              name="user"
              autoComplete="username"
              placeholder="sr.dom.pryj"
              defaultValue="admin"
            />
          </div>

          <div className="login-field">
            <label htmlFor="pass">Password</label>
            <input
              id="pass"
              name="pass"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              defaultValue="railopt"
            />
          </div>

          <div className="login-creds-hint">
            DEMO CREDENTIALS: <strong>admin</strong> / <strong>railopt</strong> (Section Controller)
          </div>

          {err && (
            <div style={{ color: "var(--state-critical)", fontSize: "11.5px", fontWeight: 600 }}>
              {err}
            </div>
          )}

          <button className="btn-rail btn-rail-primary size-lg full-width" type="submit">
            Authenticate & Open Corridor
          </button>
        </form>

        <div className="login-system-status">
          <div className="status-item">
            <span className="dot green" />
            <span>TMS READY</span>
          </div>
          <div className="status-item">
            <span className="dot green" />
            <span>SMMS READY</span>
          </div>
          <div className="status-item">
            <span className="dot green" />
            <span>TDMS READY</span>
          </div>
          <div className="status-item">
            <span className="dot green" />
            <span>COA READY</span>
          </div>
        </div>

        <div className="login-footer-strip">
          <span>Smart India Hackathon 2026 · PS SIH26027</span>
          <span>Decision Support System · v1.0</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState<NavView>("overview");
  const [notice, setNotice] = useState("");
  const [optDone, setOptDone] = useState(false);
  const [replanDone, setReplanDone] = useState(false);

  if (!authed) return <Login onIn={() => setAuthed(true)} />;

  const page =
    view === "overview" ? (
      <Overview go={(v) => setView(v as NavView)} />
    ) : view === "planning" ? (
      <Planning
        onGenerate={() => {
          setNotice("Planning run RP-2026-091 initialized. Solver model primed with 500 tasks.");
          setView("optimizer");
        }}
      />
    ) : view === "tasks" ? (
      <Tasks />
    ) : view === "blocks" ? (
      <Blocks />
    ) : view === "compatibility" ? (
      <Compatibility />
    ) : view === "optimizer" ? (
      <Optimizer
        done={optDone}
        run={() => {
          setOptDone(true);
          setNotice("CP-SAT solver converged in 2.84s · 382 tasks packed, 0 hard conflicts, 91% priority coverage.");
        }}
      />
    ) : view === "schedule" ? (
      <Schedule />
    ) : view === "replanning" ? (
      <Replanning
        done={replanDone}
        run={() => {
          setReplanDone(true);
          setNotice("Unplanned defect A37 inserted. Seven tasks retimed, passenger paths held strictly intact.");
        }}
      />
    ) : view === "validation" ? (
      <Validation />
    ) : view === "analytics" ? (
      <Analytics />
    ) : view === "integration" ? (
      <Integration />
    ) : view === "quality" ? (
      <Quality />
    ) : (
      <Settings />
    );

  return (
    <AppShell
      currentView={view}
      onSelectView={(v) => {
        setView(v);
        setNotice("");
      }}
      pageName={pageTitles[view] || "Corridor Maintenance Control"}
      notice={notice}
      onDismissNotice={() => setNotice("")}
    >
      {page}
    </AppShell>
  );
}
