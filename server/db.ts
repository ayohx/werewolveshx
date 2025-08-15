import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../shared/schema";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });
export const db = drizzle(pool, { schema });

// Run migrations on startup (no-op if already up to date)
(async () => {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const migrationsFolder = path.resolve(__dirname, "..", "db", "migrations");
    await migrate(db, { migrationsFolder });
    console.log("Database migrations are up to date.");
  } catch (err) {
    console.error("Failed to run migrations:", err);
  }
})();
