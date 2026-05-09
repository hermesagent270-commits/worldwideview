import { execSync } from "child_process";
import fs from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
const { Pool } = pg;

const SQLITE_DB_PATH = "./data/wwv.db";
const MIGRATED_MARKER = "./data/wwv.db.migrated";

async function run() {
  if (!fs.existsSync(SQLITE_DB_PATH)) {
    // No SQLite database found, nothing to migrate
    return;
  }

  if (fs.existsSync(MIGRATED_MARKER)) {
    console.log("[migration] SQLite database already migrated. Skipping.");
    return;
  }

  console.log("[migration] Legacy SQLite database detected. Initiating migration to PostgreSQL...");

  // Initialize Prisma client connecting to PostgreSQL natively via adapter
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[migration] DATABASE_URL environment variable is missing.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();

    const tablesToMigrate = [
      { sqlite: "users", prisma: prisma.user, key: "id" },
      { sqlite: "workspaces", prisma: prisma.workspace, key: "id" },
      { sqlite: "workspace_members", prisma: prisma.workspaceMember, key: "id" },
      { sqlite: "favorites", prisma: prisma.favorite, key: "id" },
      { sqlite: "installed_plugins", prisma: prisma.installedPlugin, key: "id" },
      { sqlite: "settings", prisma: prisma.setting, key: "id" }
    ];

    for (const table of tablesToMigrate) {
      console.log(`[migration] Migrating table: ${table.sqlite}...`);
      let rowsJson = "[]";
      try {
        // Read data from SQLite
        const isWindows = process.platform === "win32";
        const cmd = isWindows 
          ? `docker run --rm -v "${process.cwd().replace(/\\/g, '/')}/data:/data" keinos/sqlite3 sqlite3 --json /data/wwv.db "SELECT * FROM ${table.sqlite};"`
          : `sqlite3 --json ${SQLITE_DB_PATH} "SELECT * FROM ${table.sqlite};"`;
          
        const output = execSync(cmd, { encoding: "utf-8", stdio: ['pipe', 'pipe', 'ignore'] });
        if (output && output.trim()) {
          rowsJson = output;
        }
      } catch (err) {
        // Table might not exist in SQLite (e.g., workspaces was newly added), that's fine
        console.log(`[migration] Skipping table ${table.sqlite} (might not exist in legacy DB).`);
        continue;
      }

      const rows = JSON.parse(rowsJson);
      if (rows.length === 0) {
        continue;
      }

      console.log(`[migration] Found ${rows.length} rows in ${table.sqlite}. Insertions...`);
      let inserted = 0;
      for (const row of rows) {
        // Handle boolean fields which are 1/0 in SQLite
        if (table.sqlite === "installed_plugins" && "enabled" in row) {
          row.enabled = row.enabled === 1;
        }
        
        // Handle dates which are strings/numbers in SQLite
        const dateFields = ["createdAt", "updatedAt", "lastSeen", "installedAt", "joinedAt"];
        for (const field of dateFields) {
          if (row[field]) {
            // SQLite dates might be stored as Unix timestamps or strings
            // If it's a number, it could be seconds or milliseconds. Prisma stores ms.
            if (typeof row[field] === "number") {
              // If it's in seconds (typical Unix timestamp), multiply by 1000
              // A timestamp in 2024 is around 1.7e9, in ms it's 1.7e12
              const isSeconds = row[field] < 1e11;
              row[field] = new Date(isSeconds ? row[field] * 1000 : row[field]);
            } else {
              row[field] = new Date(row[field]);
            }
          }
        }

        try {
          // All these tables have "id" as the primary key.
          const exists = await table.prisma.findUnique({
            where: { id: row.id }
          });

          if (!exists) {
            await table.prisma.create({
              data: row
            });
            inserted++;
          }
        } catch (err) {
          console.error(`[migration] Failed to insert row into ${table.sqlite}: ${err.message}`);
        }
      }
      console.log(`[migration] Inserted ${inserted} new rows into PostgreSQL table ${table.sqlite}.`);
    }

    // Mark as migrated
    fs.writeFileSync(MIGRATED_MARKER, new Date().toISOString(), "utf8");
    console.log("[migration] SQLite to PostgreSQL migration completed successfully!");
    console.log("[migration] Note: You can safely delete ./data/wwv.db now.");
    
  } catch (err) {
    console.error("[migration] Fatal error during migration:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
