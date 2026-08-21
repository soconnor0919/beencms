import { copyFile, stat } from "fs/promises";
import path from "path";

const [sourceArg, confirmation] = process.argv.slice(2);
if (!sourceArg || confirmation !== "--confirm-replace") {
  console.error("Usage: bun run db:restore <backup.sqlite> --confirm-replace");
  process.exit(1);
}

const source = path.resolve(sourceArg);
const target = path.resolve(process.env.DATABASE_URL ?? "db.sqlite");
if (source === target) throw new Error("Backup and active database paths must differ.");
await stat(source);
await copyFile(source, target);
console.log(`Restored ${target} from ${source}. Run this only while hadlockCMS is stopped.`);
