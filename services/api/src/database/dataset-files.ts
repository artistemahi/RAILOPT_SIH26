import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATASET_ROOT = path.resolve(__dirname, "../../../../data/railopt_raw");

export type DatasetFile = {
  file: string;
  table: string;
};

/**
 * Synthetic RAILOPT CSVs and the railopt.* table each one loads into.
 * Order matters because PostgreSQL foreign keys must point to records
 * that already exist.
 */
export const DATASET_FILES: DatasetFile[] = [
  {
    file: "01_master/locations.csv",
    table: "locations",
  },
  {
    file: "01_master/sections.csv",
    table: "sections",
  },
  {
    file: "01_master/section_network.csv",
    table: "section_network",
  },
  {
    file: "01_master/assets.csv",
    table: "assets",
  },
  {
    file: "01_master/resources.csv",
    table: "resources",
  },

  {
    file: "02_maintenance/defects1.csv",
    table: "defects",
  },
  {
    file: "02_maintenance/maintenance_tasks.csv",
    table: "maintenance_tasks",
  },
  {
    file: "02_maintenance/dependencies.csv",
    table: "dependencies",
  },
  {
    file: "02_maintenance/task_resources.csv",
    table: "task_resources",
  },

  {
    file: "03_block_planning/blocks.csv",
    table: "blocks",
  },
  {
    file: "03_block_planning/block_requirements.csv",
    table: "block_requirements",
  },
  {
    file: "03_block_planning/block_sections.csv",
    table: "block_sections",
  },
  {
    file: "03_block_planning/block_windows.csv",
    table: "block_windows",
  },
  {
    file: "03_block_planning/window_sections.csv",
    table: "window_sections",
  },

  {
    file: "04_operations/train_movements.csv",
    table: "train_movements",
  },

  {
    file: "05_compatibility/compatibility_rules.csv",
    table: "compatibility_rules",
  },

  {
    file: "07_ml/historical_records.csv",
    table: "historical_records",
  },
];
