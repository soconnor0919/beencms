import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordAnalyticsEvent } from "~/lib/analytics";
import { resolvePublicSiteId } from "~/lib/sites";

const eventInput = z.object({
  kind: z.enum(["pageview", "outbound_click"]),
  path: z.string().max(2048),
  name: z.string().max(128).optional(),
  referrer: z.string().max(2048).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json"))
    return NextResponse.json({ error: "JSON required." }, { status: 415 });
  const parsed = eventInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const siteId = await resolvePublicSiteId(request.headers);
  await recordAnalyticsEvent({
    siteId,
    headers: request.headers,
    ...parsed.data,
  });
  return new NextResponse(null, { status: 204 });
}
