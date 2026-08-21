import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import Database from "better-sqlite3";

if (process.argv[2] !== "--confirm-schema-current") {
  console.error(
    "Usage: bun run db:baseline --confirm-schema-current\nRun bun run db:push first so the existing database matches the current schema.",
  );
  process.exit(1);
}

const databasePath = path.resolve(process.env.DATABASE_URL ?? "db.sqlite");
const journal = JSON.parse(
  await readFile(path.resolve("drizzle/meta/_journal.json"), "utf8"),
) as { entries: Array<{ tag: string; when: number }> };
const database = new Database(databasePath);
try {
  const existing = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'trellis_dynamic_page'",
    )
    .get();
  if (!existing)
    throw new Error(
      "Current platform tables were not found. Run bun run db:push before baselining.",
    );
  database.exec(
    "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)",
  );
  const lookup = database.prepare(
    "SELECT id FROM __drizzle_migrations WHERE hash = ?",
  );
  const insert = database.prepare(
    "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
  );
  let registered = 0;
  for (const entry of journal.entries) {
    const sql = await readFile(
      path.resolve("drizzle", `${entry.tag}.sql`),
      "utf8",
    );
    const hash = createHash("sha256").update(sql).digest("hex");
    if (!lookup.get(hash)) {
      insert.run(hash, entry.when);
      registered += 1;
    }
  }
  console.log(
    `Registered ${registered} migration${registered === 1 ? "" : "s"} as already applied.`,
  );
} finally {
  database.close();
}
