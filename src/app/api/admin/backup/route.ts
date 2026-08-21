import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { auth } from "~/server/auth";
import { db, sqlite } from "~/server/db";
import { userProfile } from "~/server/db/schema";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const profile = db.select({ role: userProfile.role }).from(userProfile).where(eq(userProfile.userId, session.user.id)).get();
  if (profile?.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

  const directory = await mkdtemp(path.join(tmpdir(), "hadlockcms-backup-"));
  const filename = `hadlockcms-${new Date().toISOString().slice(0, 10)}.sqlite`;
  const target = path.join(directory, filename);
  try {
    await sqlite.backup(target);
    const backup = await readFile(target);
    return new Response(backup, {
      headers: {
        "content-type": "application/vnd.sqlite3",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
