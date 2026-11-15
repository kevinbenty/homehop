// Applies pending SQL migrations from ./drizzle before each build.
// Safe to run repeatedly: applied migrations are tracked in the database.
// Skips quietly when DATABASE_URL isn't set (demo deployments, local builds).
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("migrate: DATABASE_URL not set, skipping");
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("migrate: database is up to date");
} finally {
  await sql.end();
}
