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

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
  maxUses: 7500,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: false
});
export const db = drizzle(pool, { schema });

// Database connection health check
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
}

// Retry function for database operations
export async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      console.log(`Database operation failed (attempt ${i + 1}/${maxRetries}):`, err);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
  }
  throw lastError!;
}

// Run migrations on startup (no-op if already up to date)
(async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      // Test connection first
      const isConnected = await testConnection();
      if (!isConnected) {
        throw new Error('Database connection test failed');
      }

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationsFolder = path.resolve(__dirname, "..", "db", "migrations");
      const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
      
      if (!fs.existsSync(journalPath)) {
        fs.mkdirSync(path.dirname(journalPath), { recursive: true });
        fs.writeFileSync(journalPath, JSON.stringify({ entries: [] }, null, 2));
      }
      
      await withRetry(() => migrate(db, { migrationsFolder }));
      console.log("Database migrations are up to date.");
      break;
    } catch (err) {
      retries--;
      console.error(`Failed to run migrations (${5 - retries}/5):`, err);
      if (retries > 0) {
        console.log(`Retrying in ${6 - retries} seconds...`);
        await new Promise(resolve => setTimeout(resolve, (6 - retries) * 1000));
      } else {
        console.error("All migration attempts failed. Server will continue but database may not be ready.");
        break;
      }
    }
  }
})();
