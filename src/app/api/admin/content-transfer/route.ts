import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  customForm,
  dynamicPage,
  reusableBlock,
  taxonomyTerm,
} from "~/server/db/schema";
import { resolveMemberSite } from "~/lib/sites";

async function requireAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  const membership = await resolveMemberSite(request.headers, session.user.id);
  return membership && ["owner", "admin"].includes(membership.role)
    ? { session, membership }
    : null;
}

const transfer = z.object({
  format: z.literal("hadlockcms-content"),
  version: z.literal(1),
  pages: z.array(
    z.object({
      id: z.string(),
      siteId: z.string(),
      parentId: z.string().nullable(),
      title: z.string(),
      slug: z.string(),
      locale: z.string(),
      status: z.enum([
        "draft",
        "in_review",
        "approved",
        "scheduled",
        "published",
        "archived",
      ]),
      layout: z.string(),
      draftLayout: z.string().nullable(),
      seoTitle: z.string().nullable(),
      seoDescription: z.string().nullable(),
      ogImage: z.string().nullable(),
      canonical: z.string().nullable(),
      noIndex: z.boolean(),
    }),
  ),
  reusableBlocks: z.array(
    z.object({
      id: z.string(),
      siteId: z.string(),
      name: z.string(),
      category: z.string().nullable(),
      content: z.string(),
      draftContent: z.string().nullable(),
    }),
  ),
  forms: z.array(
    z.object({
      id: z.string(),
      siteId: z.string(),
      name: z.string(),
      slug: z.string(),
      fields: z.string(),
      submitLabel: z.string(),
      successMessage: z.string(),
      notificationEmail: z.string().nullable(),
      active: z.boolean(),
    }),
  ),
  terms: z.array(
    z.object({
      siteId: z.string(),
      type: z.enum(["category", "tag"]),
      name: z.string(),
      slug: z.string(),
      parentId: z.number().nullable(),
    }),
  ),
});

export async function GET(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  const siteId = access.membership.siteId;
  const [pages, reusableBlocks, forms, terms] = await Promise.all([
    db.select().from(dynamicPage).where(eq(dynamicPage.siteId, siteId)),
    db.select().from(reusableBlock).where(eq(reusableBlock.siteId, siteId)),
    db.select().from(customForm).where(eq(customForm.siteId, siteId)),
    db.select().from(taxonomyTerm).where(eq(taxonomyTerm.siteId, siteId)),
  ]);
  const payload = {
    format: "hadlockcms-content" as const,
    version: 1 as const,
    exportedAt: new Date().toISOString(),
    pages,
    reusableBlocks,
    forms,
    terms: terms.map(({ id: _id, ...term }) => term),
  };
  return Response.json(payload, {
    headers: {
      "content-disposition": `attachment; filename="hadlockcms-content-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const access = await requireAdmin(request);
  if (!access) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (request.headers.get("x-hadlockcms-confirm") !== "MERGE")
    return Response.json(
      { error: "Missing explicit MERGE confirmation header" },
      { status: 400 },
    );
  const input = transfer.parse(await request.json());
  const foreignCollision = [
    ...input.pages.map((item) =>
      db
        .select({ siteId: dynamicPage.siteId })
        .from(dynamicPage)
        .where(eq(dynamicPage.id, item.id))
        .get(),
    ),
    ...input.reusableBlocks.map((item) =>
      db
        .select({ siteId: reusableBlock.siteId })
        .from(reusableBlock)
        .where(eq(reusableBlock.id, item.id))
        .get(),
    ),
    ...input.forms.map((item) =>
      db
        .select({ siteId: customForm.siteId })
        .from(customForm)
        .where(eq(customForm.id, item.id))
        .get(),
    ),
  ].some((record) => record && record.siteId !== access.membership.siteId);
  if (foreignCollision)
    return Response.json(
      { error: "The import contains an ID already owned by another site" },
      { status: 409 },
    );
  db.transaction((tx) => {
    for (const page of input.pages)
      tx.insert(dynamicPage)
        .values({
          ...page,
          siteId: access.membership.siteId,
          createdBy: access.session.user.id,
        })
        .onConflictDoUpdate({
          target: dynamicPage.id,
          set: { ...page, siteId: access.membership.siteId },
        })
        .run();
    for (const block of input.reusableBlocks)
      tx.insert(reusableBlock)
        .values({
          ...block,
          siteId: access.membership.siteId,
          createdBy: access.session.user.id,
        })
        .onConflictDoUpdate({
          target: reusableBlock.id,
          set: { ...block, siteId: access.membership.siteId },
        })
        .run();
    for (const form of input.forms)
      tx.insert(customForm)
        .values({ ...form, siteId: access.membership.siteId })
        .onConflictDoUpdate({
          target: customForm.id,
          set: { ...form, siteId: access.membership.siteId },
        })
        .run();
    for (const term of input.terms)
      tx.insert(taxonomyTerm)
        .values({ ...term, siteId: access.membership.siteId })
        .onConflictDoNothing()
        .run();
  });
  return Response.json({
    imported: {
      pages: input.pages.length,
      reusableBlocks: input.reusableBlocks.length,
      forms: input.forms.length,
      terms: input.terms.length,
    },
  });
}
