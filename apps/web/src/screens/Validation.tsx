import { DataTable, MetricStrip, PageHeader, SectionPanel, StatusBadge } from "../components/rail";
import { usePlan } from "../state/PlanContext";
import { GenerateButton, PlanRequired } from "./common";

const checkHelp: Record<string, string> = {
  TASK_ONCE: "Each task is placed at most once",
  WINDOW_VALID: "Window exists, is available and matches the required block type",
  WITHIN_WINDOW: "Work (incl. setup and release) lies inside the window",
  DURATION: "Planned duration equals task duration + setup + release",
  SECTION_COVERED: "The window covers the task's section",
  SECTION_STATUS: "Section is active; TRD work only on electrified sections",
  BLOCK_CAPACITY: "Does not exceed the block's maximum duration",
  NO_TRAIN_OVERLAP: "No train movement on the section during the work",
  NO_ASSET_OVERLAP: "Never two jobs on one asset at the same time",
  TASK_TYPE_ORDER: "Repair / replacement finishes before testing on the same asset",
  RESOURCE_MATCH: "Resource department, status, skill and availability fit",
  RESOURCE_CAPACITY: "Resource capacity is never exceeded at any minute",
  DEPENDENCY_ORDER: "Mandatory predecessors finish (plus gap) before successors start",
};

export default function Validation() {
  const { plan } = usePlan();

  return (
    <>
      <PageHeader
        section="VALIDATION"
        title="Independent plan validation"
        subtitle="A separate validator re-checks every hard rule on the solver's output, without trusting the CP-SAT model"
        action={<GenerateButton />}
      />
      <PlanRequired>
        {plan && (
          <>
            <MetricStrip
              metrics={[
                { label: "Result", value: plan.validation.passed ? "PASS" : "FAIL", status: plan.validation.passed ? "success" : "danger" },
                { label: "Checks run", value: plan.validation.checks.length, status: "neutral" },
                { label: "Violations", value: plan.validation.violations.length, status: plan.validation.violations.length ? "danger" : "success" },
                { label: "Assignments checked", value: plan.assignments.length, status: "neutral" },
              ]}
            />
            <SectionPanel title="Checks" noPadding>
              <DataTable
                data={plan.validation.checks.map((check) => ({
                  check,
                  count: plan.validation.violations.filter((violation) => violation.check === check).length,
                }))}
                keyField="check"
                columns={[
                  { header: "Check", accessor: (row) => <span className="cell-mono">{row.check}</span>, width: 190 },
                  { header: "Rule", accessor: (row) => checkHelp[row.check] ?? "" },
                  { header: "Violations", accessor: "count", width: 90 },
                  { header: "Result", accessor: (row) => <StatusBadge status={row.count ? "FAIL" : "PASS"} />, width: 90 },
                ]}
              />
            </SectionPanel>
            {plan.validation.violations.length > 0 && (
              <SectionPanel title="Violations" accent="critical" noPadding>
                <DataTable
                  data={plan.validation.violations.map((violation, index) => ({ ...violation, id: index }))}
                  keyField="id"
                  columns={[
                    { header: "Check", accessor: "check", width: 180 },
                    { header: "Task", accessor: "task_id", width: 120 },
                    { header: "Message", accessor: "message" },
                  ]}
                />
              </SectionPanel>
            )}
          </>
        )}
      </PlanRequired>
    </>
  );
}
