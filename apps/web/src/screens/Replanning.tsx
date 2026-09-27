import { PageHeader, SectionPanel, StatusBadge } from "../components/rail";

export default function Replanning() {
  return (
    <>
      <PageHeader
        section="REPLANNING"
        title="Emergency replanning"
        subtitle="Not built yet"
        status={<StatusBadge status="PENDING" label="Coming soon" />}
      />
      <SectionPanel title="Planned scope" accent="warning">
        <p style={{ marginBottom: 8 }}>
          This screen is a placeholder. Emergency replanning is not implemented yet; nothing on this page is live.
        </p>
        <ul style={{ paddingLeft: 16 }} className="muted-note">
          <li>Record a disruption (window lost, resource unavailable, new urgent task)</li>
          <li>Freeze work that is already approved or in progress</li>
          <li>Re-optimize the remaining tasks with CP-SAT, staying close to the current plan</li>
          <li>Compare plan versions (V1 vs V2) and let the planner approve, modify or reject</li>
        </ul>
        <p className="muted-note" style={{ marginTop: 8 }}>
          Until then, the What-if screen can simulate lost windows, resources and new trains against a baseline plan.
        </p>
      </SectionPanel>
    </>
  );
}
