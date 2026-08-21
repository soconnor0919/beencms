import { sql } from "drizzle-orm";
import { db } from "~/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    db.run(sql`select 1`);
    return Response.json({ status: "ok", service: "hadlockCMS", checkedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ status: "error", service: "hadlockCMS" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
