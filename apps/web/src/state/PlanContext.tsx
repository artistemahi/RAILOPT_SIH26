import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { generateBlockPlan } from "../services/blockPlannerService";
import type { BlockPlan } from "../types/planner";

interface PlanState {
  plan: BlockPlan | null;
  generatedAt: Date | null;
  planning: boolean;
  error: string | null;
  /** Runs ML → CP-SAT; resolves true when a plan was produced. */
  generate: () => Promise<boolean>;
}

const PlanContext = createContext<PlanState | null>(null);

/**
 * The latest ML → CP-SAT plan, shared by the Optimization, Schedule,
 * Validation, Analytics, Tasks and Coordination screens so one run feeds
 * every view.
 */
export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<BlockPlan | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setPlanning(true);
    setError(null);
    try {
      setPlan(await generateBlockPlan());
      setGeneratedAt(new Date());
      return true;
    } catch {
      setError("Block planning failed. Check that the API, ML and optimizer services are running.");
      return false;
    } finally {
      setPlanning(false);
    }
  }, []);

  return (
    <PlanContext.Provider value={{ plan, generatedAt, planning, error, generate }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanState {
  const state = useContext(PlanContext);
  if (!state) throw new Error("usePlan must be used inside PlanProvider");
  return state;
}
