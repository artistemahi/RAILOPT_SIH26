import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { pool } from "../config/database.js";
import { DATASET_FILES, DATASET_ROOT } from "./dataset-files.js";

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