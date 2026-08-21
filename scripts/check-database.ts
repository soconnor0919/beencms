import Database from "better-sqlite3";
import path from "path";

const databasePath = path.resolve(process.env.DATABASE_URL ?? "db.sqlite");
const database = new Database(databasePath, {
  readonly: true,
  fileMustExist: true,
});
try {
  const quickCheck = database.pragma("quick_check") as Array<{
    quick_check: string;
  }>;
  const foreignKeys = database.pragma("foreign_key_check") as unknown[];
  if (quickCheck.length !== 1 || quickCheck[0]?.quick_check !== "ok")
    throw new Error(`SQLite quick_check failed: ${JSON.stringify(quickCheck)}`);
  if (foreignKeys.length)
    throw new Error(
      `SQLite foreign_key_check found ${foreignKeys.length} violation(s).`,
    );
  console.log("SQLite integrity and foreign-key checks passed.");
} finally {
  database.close();
}
