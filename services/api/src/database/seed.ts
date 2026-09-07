import { pool } from "../config/database.js";

const assets = [
  ["A104", "Signal", "S&T", "C1", "Needs Maintenance", 87],
  ["T221", "Track", "Engineering", "C1", "Needs Maintenance", 81],
  ["S309", "Switch", "S&T", "C1", "Needs Maintenance", 72],
  ["O112", "Overhead Line", "TRD", "C1", "Needs Maintenance", 68],
  ["T118", "Track", "Engineering", "C1", "Needs Maintenance", 55],
];

const maintenanceTasks = [
  ["M104", "A104", "Signal Repair", "S&T", "P1", 87, 17, 90],
  ["M221", "T221", "Track Inspection", "Engineering", "P1", 81, 12, 120],
  ["M309", "S309", "Switch Maintenance", "S&T", "P2", 72, 8, 90],
  ["M112", "O112", "Overhead Line Check", "TRD", "P2", 68, 6, 60],
  ["M118", "T118", "Track Renewal", "Engineering", "P3", 55, 3, 180],
];

const trains = [
  ["T001", "Rajdhani Express", "NDLS-ALD-CNB-LKO", "SEC01", "06:30"],
  ["T002", "Shatabdi Express", "NDLS-ALD-CNB-LKO", "SEC02", "07:15"],
  ["T003", "Intercity Express", "NDLS-ALD-CNB-LKO", "SEC03", "08:00"],
  ["T004", "Freight Service", "NDLS-ALD-CNB-LKO", "SEC04", "08:45"],
];

const infrastructureConditions = [
  [1, "SEC01", "Signal Reliability", 0, 24, "Good"],
  [2, "SEC02", "Track Geometry", 24, 48, "Watch"],
  [3, "SEC03", "Switch Wear", 48, 72, "Moderate"],
  [4, "SEC04", "Overhead Line Tension", 72, 96, "Good"],
];

const riskPredictions = [
  [1, "M104", 87, "High", "2025-05-20 06:00:00"],
  [2, "M221", 81, "High", "2025-05-20 06:00:00"],
  [3, "M309", 72, "Medium", "2025-05-20 06:00:00"],
  [4, "M112", 68, "Medium", "2025-05-20 06:00:00"],
  [5, "M118", 55, "Medium", "2025-05-20 06:00:00"],
];

const maintenanceBlocks = [
  [
    "B104",
    "SEC02",
    "02:00",
    "05:00",
    180,
    "Low",
    "High",
    "Planned",
    "Feasible",
  ],
  [
    "B118",
    "SEC04",
    "01:00",
    "04:00",
    180,
    "Low",
    "Medium",
    "Planned",
    "Feasible",
  ],
];

const trainImpacts = [
  [1, "B104", "T001", 8, "Low"],
  [2, "B104", "T002", 15, "Medium"],
  [3, "B104", "T003", 10, "Low"],
  [4, "B118", "T004", 12, "Medium"],
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let assetsInserted = 0;
    for (const asset of assets) {
      const result = await client.query(
        `INSERT INTO assets (id, asset_type, department, section, condition, criticality)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        asset,
      );
      assetsInserted += result.rowCount ?? 0;
    }

    let maintenanceTasksInserted = 0;
    for (const task of maintenanceTasks) {
      const result = await client.query(
        `INSERT INTO maintenance_tasks
          (id, asset_id, task, department, priority, risk_score, overdue_days, duration_min, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')
         ON CONFLICT (id) DO NOTHING`,
        task,
      );
      maintenanceTasksInserted += result.rowCount ?? 0;
    }

    let trainsInserted = 0;
    for (const train of trains) {
      const result = await client.query(
        `INSERT INTO trains (id, train_name, route, section, scheduled_departure)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        train,
      );
      trainsInserted += result.rowCount ?? 0;
    }

    let infrastructureConditionsInserted = 0;
    for (const condition of infrastructureConditions) {
      const result = await client.query(
        `INSERT INTO infrastructure_conditions
          (id, section, condition_type, start_km, end_km, severity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        condition,
      );
      infrastructureConditionsInserted += result.rowCount ?? 0;
    }

    let riskPredictionsInserted = 0;
    for (const prediction of riskPredictions) {
      const result = await client.query(
        `INSERT INTO risk_predictions
          (id, maintenance_task_id, risk_score, risk_level, prediction_date)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        prediction,
      );
      riskPredictionsInserted += result.rowCount ?? 0;
    }

    let maintenanceBlocksInserted = 0;
    for (const block of maintenanceBlocks) {
      const result = await client.query(
        `INSERT INTO maintenance_blocks
          (id, section, start_time, end_time, duration_min, train_impact,
           priority_coverage, status, solver_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        block,
      );
      maintenanceBlocksInserted += result.rowCount ?? 0;
    }

    let trainImpactsInserted = 0;
    for (const impact of trainImpacts) {
      const result = await client.query(
        `INSERT INTO train_impacts
          (id, block_id, train_id, predicted_delay_min, impact_level)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        impact,
      );
      trainImpactsInserted += result.rowCount ?? 0;
    }

    await client.query("COMMIT");
    console.log(
      `Seed succeeded: ${assetsInserted} assets, ${maintenanceTasksInserted} maintenance tasks, ${trainsInserted} trains, ${infrastructureConditionsInserted} infrastructure conditions, ${riskPredictionsInserted} risk predictions, ${maintenanceBlocksInserted} maintenance blocks, ${trainImpactsInserted} train impacts inserted.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
