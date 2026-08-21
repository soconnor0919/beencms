import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { createPreviewToken } from "~/lib/preview-token";
import { resolveMemberSite } from "~/lib/sites";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await resolveMemberSite(request.headers, session.user.id);
  if (!membership || !["owner", "admin", "editor"].includes(membership.role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  if (!slug)
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  const token = createPreviewToken(`${membership.siteId}:post:${slug}`);
  return NextResponse.json({
    url: `${url.origin}/blog/${encodeURIComponent(slug)}?preview=${encodeURIComponent(token)}`,
  });
}
