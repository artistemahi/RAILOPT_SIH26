import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "csv-parse/sync";

import { pool } from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATASET_ROOT = path.resolve(__dirname, "../../../../data/railopt_raw");

type DatasetFile = {
  file: string;
  table: string;
};

/**
 * IMPORTANT:
 * Order matters because PostgreSQL foreign keys must point
 * to records that already exist.
 */
const DATASET_FILES: DatasetFile[] = [
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

function normalizeValue(value: string | undefined): string | boolean | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const lower = trimmed.toLowerCase();

  if (lower === "true") {
    return true;
  }

  if (lower === "false") {
    return false;
  }

  return trimmed;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function importFile(
  filePath: string,
  tableName: string,
): Promise<number> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const csvText = fs.readFileSync(filePath, "utf8");

  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as Record<string, string>[];

  if (records.length === 0) {
    console.log(`⚠️  ${tableName}: 0 rows`);
    return 0;
  }

  const columns = Object.keys(records[0]);

  if (columns.length === 0) {
    throw new Error(`No columns detected in ${filePath}`);
  }

  const quotedColumns = columns.map(quoteIdentifier).join(", ");

  const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

  const query = `
    INSERT INTO railopt.${quoteIdentifier(tableName)}
      (${quotedColumns})
    VALUES
      (${placeholders})
    ON CONFLICT DO NOTHING;
  `;

  const client = await pool.connect();

  try {
    let insertedOrProcessed = 0;

    for (const record of records) {
      const values = columns.map((column) =>
        normalizeValue(record[column]),
      );

      await client.query(query, values);
      insertedOrProcessed += 1;
    }

    return insertedOrProcessed;
  } finally {
    client.release();
  }
}

async function importDataset(): Promise<void> {
  console.log("======================================");
  console.log("RAILOPT DATASET IMPORT");
  console.log("======================================");
  console.log(`Dataset root: ${DATASET_ROOT}`);
  console.log("");

  const client = await pool.connect();

  try {
    // Dataset import is a controlled administrative operation.
  // Disable the session statement timeout for this import.
  await client.query("SET statement_timeout = 0");
    await client.query("BEGIN");

    for (const datasetFile of DATASET_FILES) {
      const filePath = path.join(DATASET_ROOT, datasetFile.file);

      console.log(`📥 Importing ${datasetFile.file}`);
      console.log(`   → railopt.${datasetFile.table}`);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing dataset file: ${filePath}`);
      }

      const csvText = fs.readFileSync(filePath, "utf8");

      const records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      }) as Record<string, string>[];

      if (records.length === 0) {
        console.log("   ⚠️  No rows found");
        continue;
      }

      const columns = Object.keys(records[0]);

      const quotedColumns = columns.map(quoteIdentifier).join(", ");

      const placeholders = columns
        .map((_, index) => `$${index + 1}`)
        .join(", ");

      const query = `
        INSERT INTO railopt.${quoteIdentifier(datasetFile.table)}
          (${quotedColumns})
        VALUES
          (${placeholders})
        ON CONFLICT DO NOTHING;
      `;

      for (const record of records) {
        const values = columns.map((column) =>
          normalizeValue(record[column]),
        );

        await client.query(query, values);
      }

      console.log(`   ✅ ${records.length} rows processed`);
      console.log("");
    }

    await client.query("COMMIT");

    console.log("======================================");
    console.log("✅ DATASET IMPORT COMPLETED");
    console.log("======================================");
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("");
    console.error("❌ DATASET IMPORT FAILED");
    console.error(error);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

importDataset().catch((error) => {
  console.error("❌ Unexpected importer error:");
  console.error(error);
  process.exitCode = 1;
});