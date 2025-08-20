import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { config } from "dotenv";

config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log("Running migrations...");
    await migrate(db, { migrationsFolder: "db/migrations" });
    console.log("Migrations completed successfully!");
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }
}

runMigrations();
