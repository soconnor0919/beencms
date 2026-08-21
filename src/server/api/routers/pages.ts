import { randomUUID } from "crypto";
import { and, asc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  editorProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { auditLog, contentRevision, dynamicPage } from "~/server/db/schema";
import { emitWebhook } from "~/lib/webhooks";
import { validateBlockLayout } from "~/lib/blocks";

const pageState = z.enum([
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
]);
const pageInput = z.object({
  id: z.string().optional(),
  parentId: z.string().nullable().optional(),
  title: z.string().min(1).max(512),
  slug: z
    .string()
    .min(1)
    .max(512)
    .regex(/^\/?[a-z0-9][a-z0-9/-]*$/),
  locale: z.string().min(2).max(32).default("en-US"),
  status: pageState.default("draft"),
  seoTitle: z.string().max(512).nullable().optional(),
  seoDescription: z.string().max(1000).nullable().optional(),
  ogImage: z.string().nullable().optional(),
  canonical: z.string().url().nullable().optional(),
  noIndex: z.boolean().default(false),
  publishAt: z.date().nullable().optional(),
  unpublishAt: z.date().nullable().optional(),
});

const normalizeSlug = (slug: string) => slug.replace(/^\/+|\/+$/g, "");

export const pagesRouter = createTRPCRouter({
  getPublishedBySlug: publicProcedure
    .input(
      z.object({
        slug: z.string(),
        locale: z.string().default("en-US"),
      }),
    )
    .query(({ ctx, input }) => {
      const now = new Date();
      return ctx.db
        .select()
        .from(dynamicPage)
        .where(
          and(
            eq(dynamicPage.siteId, ctx.siteId),
            eq(dynamicPage.slug, normalizeSlug(input.slug)),
            eq(dynamicPage.locale, input.locale),
            or(
              eq(dynamicPage.status, "published"),
              and(
                eq(dynamicPage.status, "scheduled"),
                lte(dynamicPage.publishAt, now),
              ),
            ),
            or(
              isNull(dynamicPage.unpublishAt),
              gt(dynamicPage.unpublishAt, now),
            ),
          ),
        )
        .get();
    }),

  getAll: editorProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(dynamicPage)
      .where(eq(dynamicPage.siteId, ctx.siteId))
      .orderBy(asc(dynamicPage.slug), asc(dynamicPage.locale)),
  ),

  getById: editorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(dynamicPage)
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        )
        .get(),
    ),

  upsert: editorProcedure.input(pageInput).mutation(async ({ ctx, input }) => {
    if (input.status === "scheduled" && !input.publishAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose a publishing date for a scheduled page.",
      });
    }
    if (
      input.publishAt &&
      input.unpublishAt &&
      input.unpublishAt <= input.publishAt
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The expiry date must be after the publishing date.",
      });
    }
    const id = input.id ?? randomUUID();
    if (input.id) {
      const existing = ctx.db
        .select({ id: dynamicPage.id })
        .from(dynamicPage)
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        )
        .get();
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    }
    const values = {
      ...input,
      id,
      siteId: ctx.siteId,
      slug: normalizeSlug(input.slug),
      createdBy: ctx.session.user.id,
    };
    await ctx.db
      .insert(dynamicPage)
      .values(values)
      .onConflictDoUpdate({
        target: dynamicPage.id,
        set: {
          parentId: values.parentId ?? null,
          title: values.title,
          slug: values.slug,
          locale: values.locale,
          status: values.status,
          seoTitle: values.seoTitle ?? null,
          seoDescription: values.seoDescription ?? null,
          ogImage: values.ogImage ?? null,
          canonical: values.canonical ?? null,
          noIndex: values.noIndex,
          publishAt: values.publishAt ?? null,
          unpublishAt: values.unpublishAt ?? null,
        },
      });
    await ctx.db.insert(auditLog).values({
      siteId: ctx.siteId,
      userId: ctx.session.user.id,
      userEmail: ctx.session.user.email,
      action: input.id ? "page.update" : "page.create",
      entity: `dynamic_page:${id}`,
      detail: values.title,
    });
    return { id };
  }),

  saveDraft: editorProcedure
    .input(z.object({ id: z.string(), layout: z.string().max(2_000_000) }))
    .mutation(async ({ ctx, input }) => {
      try {
        validateBlockLayout(JSON.parse(input.layout));
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Invalid page layout.",
        });
      }
      const result = await ctx.db
        .update(dynamicPage)
        .set({ draftLayout: input.layout })
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        );
      if (!result.changes) throw new TRPCError({ code: "NOT_FOUND" });
    }),

  publish: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = ctx.db
        .select()
        .from(dynamicPage)
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        )
        .get();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      const layout = row.draftLayout ?? row.layout;
      await ctx.db.insert(contentRevision).values({
        siteId: ctx.siteId,
        entityType: "page",
        entityId: `dynamic:${row.id}`,
        snapshot: JSON.stringify({ layout }),
        createdBy: ctx.session.user.id,
        createdEmail: ctx.session.user.email,
      });
      await ctx.db
        .update(dynamicPage)
        .set({
          layout,
          draftLayout: null,
          status: "published",
          publishAt: new Date(),
        })
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        );
      void emitWebhook(ctx.siteId, "content.published", {
        type: "page",
        id: row.id,
        slug: row.slug,
        title: row.title,
      });
    }),

  archive: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .update(dynamicPage)
        .set({ status: "archived" })
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        ),
    ),

  delete: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(dynamicPage)
        .where(
          and(eq(dynamicPage.siteId, ctx.siteId), eq(dynamicPage.id, input.id)),
        ),
    ),
});
