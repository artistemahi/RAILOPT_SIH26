import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  createPlanVersion,
  getPlanVersion,
  listPlanVersions,
} from "../services/planVersionsService";
import type { PlanVersion, PlanVersionSummary, VersionPlan } from "../types/versions";

const PLANNER_KEY = "railopt.plannerName";

function readPlannerName(): string {
  try {
    return localStorage.getItem(PLANNER_KEY) ?? "";
  } catch {
    return "";
  }
}

interface PlanState {
  /** The plan version shown on every plan screen. */
  plan: VersionPlan | null;
  version: PlanVersionSummary | null;
  generatedAt: Date | null;
  planning: boolean;
  error: string | null;
  /** Runs ML → CP-SAT and stores the result as a new DRAFT version. */
  generate: () => Promise<boolean>;
  loadVersion: (runId: string) => Promise<void>;
  showVersion: (version: PlanVersion) => void;
  updateSummary: (summary: PlanVersionSummary) => void;
  plannerName: string;
  setPlannerName: (name: string) => void;
}

const PlanContext = createContext<PlanState | null>(null);

/**
 * The plan version in view, shared by every plan screen so one run feeds
 * every view. On start it shows the approved version (else the latest).
 */
export function PlanProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PlanVersion | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plannerName, setName] = useState(readPlannerName);

  const setPlannerName = useCallback((name: string) => {
    setName(name);
    try {
      localStorage.setItem(PLANNER_KEY, name);
    } catch {
      // Storage unavailable: the name lasts for this page view only.
    }
  }, []);

  const loadVersion = useCallback(async (runId: string) => {
    setError(null);
    try {
      setCurrent(await getPlanVersion(runId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Plan version could not be loaded");
    }
  }, []);

  useEffect(() => {
    listPlanVersions()
      .then((versions) => {
        // Plan screens show the weekly plan; monthly plans have their own screen.
        const weekly = versions.filter((item) => item.planType === "WEEKLY");
        const pick = weekly.find((item) => item.status === "APPROVED") ?? weekly[0];
        if (pick) void loadVersion(pick.runId);
      })
      .catch(() => undefined);
  }, [loadVersion]);

  const generate = useCallback(async () => {
    setPlanning(true);
    setError(null);
    try {
      setCurrent(await createPlanVersion(plannerName || "planner"));
      return true;
    } catch {
      setError("Block planning failed. Check that the API, ML and optimizer services are running.");
      return false;
    } finally {
      setPlanning(false);
    }
  }, [plannerName]);

  const updateSummary = useCallback((summary: PlanVersionSummary) => {
    setCurrent((previous) => (previous && previous.runId === summary.runId ? { ...previous, ...summary } : previous));
  }, []);

  return (
    <PlanContext.Provider
      value={{
        plan: current?.plan ?? null,
        version: current,
        generatedAt: current ? new Date(current.createdAt.replace(" ", "T")) : null,
        planning,
        error,
        generate,
        loadVersion,
        showVersion: setCurrent,
        updateSummary,
        plannerName,
        setPlannerName,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanState {
  const state = useContext(PlanContext);
  if (!state) throw new Error("usePlan must be used inside PlanProvider");
  return state;
}
