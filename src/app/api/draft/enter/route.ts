import { draftMode } from "next/headers";
import { resolveMemberSite } from "~/lib/sites";
import { auth } from "~/server/auth";

// Enables Next.js Draft Mode so the preview iframe shows draft content.
// Requires an active admin or editor session.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const membership = await resolveMemberSite(request.headers, session.user.id);
  if (!membership || !["owner", "admin", "editor"].includes(membership.role)) {
    return new Response("Forbidden", { status: 403 });
  }
  (await draftMode()).enable();
  return Response.json({ ok: true });
}
