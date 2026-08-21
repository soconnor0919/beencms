import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";

import * as schema from "./schema";

const DB_PATH =
  process.env.DATABASE_URL ?? path.join(process.cwd(), "db.sqlite");

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

export const sqlite = globalForDb.sqlite ?? new Database(DB_PATH);
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

export const db = drizzle(sqlite, { schema });
