/**
 * Applies supabase/migrations/*.sql to a Postgres database, once each
 * (tracked in public._migrations).
 * Usage: DB_HOST=db.<ref>.supabase.co DB_PASSWORD_FILE=path node scripts/migrate.mjs
 *    or: DATABASE_URL=postgresql://... node scripts/migrate.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import pg from "pg";

const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 5432),
      user: process.env.DB_USER ?? "postgres",
      database: "postgres",
      password: process.env.DB_PASSWORD ?? readFileSync(process.env.DB_PASSWORD_FILE, "utf8").trim(),
    };

const client = new pg.Client({ ...config, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query("create table if not exists public._migrations (name text primary key, applied_at timestamptz default now())");
await client.query("alter table public._migrations enable row level security");

for (const file of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  const { rowCount } = await client.query("select 1 from public._migrations where name = $1", [file]);
  if (rowCount) { console.log("· already applied", file); continue; }
  await client.query("begin");
  try {
    await client.query(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await client.query("insert into public._migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log("✓ applied", file);
  } catch (e) {
    await client.query("rollback");
    console.error("✗ failed", file, "\n", e.message);
    process.exitCode = 1;
    break;
  }
}
await client.end();
