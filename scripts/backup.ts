import Database from "better-sqlite3";
import { mkdir, stat } from "fs/promises";
import path from "path";

const destinationArg = process.argv[2];
if (!destinationArg) {
  console.error("Usage: bun run db:backup -- /secure/path/hadlockcms.sqlite");
  process.exit(1);
}

const source = path.resolve(process.env.DATABASE_URL ?? "db.sqlite");
const destination = path.resolve(destinationArg);
if (source === destination)
  throw new Error("Backup and active database paths must differ.");
if (!destination.endsWith(".sqlite") && !destination.endsWith(".db"))
  throw new Error("Backup destination must end in .sqlite or .db.");
await stat(destination)
  .then(() => {
    throw new Error(
      "Backup destination already exists; choose a new filename.",
    );
  })
  .catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
await mkdir(path.dirname(destination), { recursive: true });
const database = new Database(source, { readonly: true, fileMustExist: true });
try {
  await database.backup(destination);
  console.log(`Created consistent SQLite backup at ${destination}.`);
} finally {
  database.close();
}
