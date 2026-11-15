import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const g = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// `prepare: false` keeps it compatible with pooled connections (Neon, Supabase pooler).
const sql = g.sql ?? postgres(process.env.DATABASE_URL ?? "postgres://localhost/homehop", { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") g.sql = sql;

export const db = drizzle(sql, { schema });
export const hasDatabase = !!process.env.DATABASE_URL;
