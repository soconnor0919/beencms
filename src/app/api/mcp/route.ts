import { createHash, timingSafeEqual } from "crypto";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { env } from "~/env";
import { createHadlockCmsMcpServer } from "~/lib/mcp";
import { db } from "~/server/db";
import { cmsSite } from "~/server/db/schema";
import { eq, or } from "drizzle-orm";
import { resolvePublicSiteId } from "~/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function matches(expectedValue: string, supplied: string) {
  const expected = Buffer.from(expectedValue);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function authorized(request: Request, tokenHash: string | null) {
  const configured = env.HADLOCKCMS_MCP_TOKEN;
  const supplied = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!supplied) return false;
  if (
    tokenHash &&
    matches(tokenHash, createHash("sha256").update(supplied).digest("hex"))
  )
    return true;
  return configured ? matches(configured, supplied) : false;
}

async function serve(request: Request) {
  const requested = request.headers.get("x-hadlockcms-site");
  const fallbackId = await resolvePublicSiteId(request.headers);
  const site = requested
    ? db
        .select()
        .from(cmsSite)
        .where(or(eq(cmsSite.id, requested), eq(cmsSite.slug, requested)))
        .get()
    : db.select().from(cmsSite).where(eq(cmsSite.id, fallbackId)).get();
  if (!site || !authorized(request, site.mcpTokenHash)) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "www-authenticate": "Bearer" } },
    );
  }
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(env.BETTER_AUTH_URL).origin) {
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  }
  const handler = createMcpHandler(() => createHadlockCmsMcpServer(site.id), {
    responseMode: "json",
  });
  return handler.fetch(request);
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;
