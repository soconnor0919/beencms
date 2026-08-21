import { eq } from "drizzle-orm";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { customForm, customFormSubmission } from "~/server/db/schema";
import { and } from "drizzle-orm";
import { resolveMemberSite } from "~/lib/sites";

const csvCell = (value: unknown) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const membership = await resolveMemberSite(request.headers, session.user.id);
  if (!membership || !["owner", "admin", "editor"].includes(membership.role))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const form = db
    .select()
    .from(customForm)
    .where(and(eq(customForm.siteId, membership.siteId), eq(customForm.id, id)))
    .get();
  if (!form) return Response.json({ error: "Not found" }, { status: 404 });
  const fields = JSON.parse(form.fields) as Array<{
    id: string;
    label: string;
  }>;
  const submissions = db
    .select()
    .from(customFormSubmission)
    .where(eq(customFormSubmission.formId, id))
    .all();
  const rows = [
    ["Submitted", "Status", ...fields.map((field) => field.label)]
      .map(csvCell)
      .join(","),
    ...submissions.map((submission) => {
      const data = JSON.parse(submission.data) as Record<string, unknown>;
      return [
        submission.createdAt.toISOString(),
        submission.status,
        ...fields.map((field) => data[field.id]),
      ]
        .map(csvCell)
        .join(",");
    }),
  ];
  return new Response(rows.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${form.slug}-submissions.csv"`,
      "cache-control": "no-store",
    },
  });
}
