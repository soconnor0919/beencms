import { z } from "zod";
import { and, desc, eq, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import { post, auditLog, contentRevision, redirects } from "~/server/db/schema";
import { emitWebhook } from "~/lib/webhooks";

const publiclyVisible = () =>
  or(
    eq(post.status, "published"),
    and(eq(post.status, "scheduled"), lte(post.scheduledAt, new Date())),
  )!;

export const postsRouter = createTRPCRouter({
  // ── Public ──────────────────────────────────────────────────────────────────

  /** Published post summaries only. */
  getAll: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        kind: z.enum(["news", "article"]).optional(),
      }),
    )
    .query(({ ctx, input }) => {
      const conditions = [eq(post.siteId, ctx.siteId), publiclyVisible()];
      if (input.category) {
        conditions.push(eq(post.category, input.category));
      }
      if (input.kind) conditions.push(eq(post.kind, input.kind));
      return ctx.db
        .select({
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          coverImage: post.coverImage,
          status: post.status,
          publishedAt: post.publishedAt,
          scheduledAt: post.scheduledAt,
          category: post.category,
          kind: post.kind,
          byline: post.byline,
          sourceUrl: post.sourceUrl,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        })
        .from(post)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(post.publishedAt), desc(post.createdAt));
    }),

  /** A published post only; draft metadata and layout stay editor-only. */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      return (
        ctx.db
          .select({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            coverImage: post.coverImage,
            layout: post.layout,
            status: post.status,
            publishedAt: post.publishedAt,
            category: post.category,
            kind: post.kind,
            byline: post.byline,
            sourceUrl: post.sourceUrl,
            seoTitle: post.seoTitle,
            seoDescription: post.seoDescription,
            ogImage: post.ogImage,
            canonical: post.canonical,
            noIndex: post.noIndex,
            authorId: post.authorId,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
          })
          .from(post)
          .where(
            and(
              eq(post.siteId, ctx.siteId),
              eq(post.slug, input.slug),
              publiclyVisible(),
            ),
          )
          .get() ?? null
      );
    }),

  // ── Editor reads ────────────────────────────────────────────────────────────

  getAllForEditor: editorProcedure.query(({ ctx }) => {
    return ctx.db
      .select({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        coverImage: post.coverImage,
        status: post.status,
        publishedAt: post.publishedAt,
        scheduledAt: post.scheduledAt,
        category: post.category,
        kind: post.kind,
        byline: post.byline,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      })
      .from(post)
      .where(eq(post.siteId, ctx.siteId))
      .orderBy(desc(post.publishedAt), desc(post.createdAt));
  }),

  getDraftBySlug: editorProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      return (
        ctx.db
          .select()
          .from(post)
          .where(and(eq(post.siteId, ctx.siteId), eq(post.slug, input.slug)))
          .get() ?? null
      );
    }),

  getById: editorProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      return (
        ctx.db
          .select()
          .from(post)
          .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)))
          .get() ?? null
      );
    }),

  // ── Editor writes ───────────────────────────────────────────────────────────

  upsert: editorProcedure
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string().min(1).max(512),
        slug: z.string().min(1).max(256),
        excerpt: z.string().max(1000).optional(),
        coverImage: z.string().optional(),
        category: z.string().max(128).optional(),
        kind: z.enum(["news", "article"]).default("article"),
        byline: z.string().max(256).optional(),
        sourceUrl: z.string().url().optional(),
        seoTitle: z.string().max(512).nullish(),
        seoDescription: z.string().max(1000).nullish(),
        ogImage: z.string().nullish(),
        canonical: z.string().url().nullish(),
        noIndex: z.boolean().default(false),
        status: z.enum(["draft", "scheduled", "published"]).default("draft"),
        scheduledAt: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...values } = input;
      if (values.status === "scheduled" && !values.scheduledAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Choose a publishing date for a scheduled post.",
        });
      }
      const publishedAt = values.status === "published" ? new Date() : null;

      if (id) {
        const existing = ctx.db
          .select({ slug: post.slug })
          .from(post)
          .where(and(eq(post.siteId, ctx.siteId), eq(post.id, id)))
          .get();
        await ctx.db
          .update(post)
          .set({ ...values, publishedAt })
          .where(and(eq(post.siteId, ctx.siteId), eq(post.id, id)));
        if (existing && existing.slug !== values.slug) {
          await ctx.db
            .insert(redirects)
            .values({
              siteId: ctx.siteId,
              fromPath: `/blog/${existing.slug}`,
              toPath: `/blog/${values.slug}`,
            })
            .onConflictDoUpdate({
              target: [redirects.siteId, redirects.fromPath],
              set: { toPath: `/blog/${values.slug}` },
            });
        }
        await ctx.db.insert(auditLog).values({
          siteId: ctx.siteId,
          userId: ctx.session.user.id,
          userEmail: ctx.session.user.email,
          action: "post.update",
          entity: `post:${id}`,
          detail: `Updated post "${values.title}"`,
        });
        return { id };
      } else {
        const [row] = await ctx.db
          .insert(post)
          .values({
            ...values,
            siteId: ctx.siteId,
            publishedAt,
            authorId: ctx.session.user.id,
          })
          .returning({ id: post.id });
        await ctx.db.insert(auditLog).values({
          siteId: ctx.siteId,
          userId: ctx.session.user.id,
          userEmail: ctx.session.user.email,
          action: "post.create",
          entity: `post:${row!.id}`,
          detail: `Created post "${values.title}"`,
        });
        return { id: row!.id };
      }
    }),

  saveDraft: editorProcedure
    .input(z.object({ id: z.number(), draftLayout: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(post)
        .set({ draftLayout: input.draftLayout })
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)));
    }),

  publish: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const row = ctx.db
        .select({
          layout: post.layout,
          draftLayout: post.draftLayout,
          title: post.title,
          slug: post.slug,
        })
        .from(post)
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)))
        .get();
      const newLayout = row?.draftLayout ?? row?.layout ?? "[]";
      await ctx.db
        .update(post)
        .set({
          layout: newLayout,
          draftLayout: null,
          status: "published",
          publishedAt: new Date(),
          scheduledAt: null,
        })
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)));
      await ctx.db.insert(contentRevision).values({
        siteId: ctx.siteId,
        entityType: "post",
        entityId: String(input.id),
        snapshot: JSON.stringify({ layout: newLayout }),
        createdBy: ctx.session.user.id,
        createdEmail: ctx.session.user.email,
      });
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "post.publish",
        entity: `post:${input.id}`,
        detail: `Published post "${row?.title ?? ""}"`,
      });
      void emitWebhook(ctx.siteId, "content.published", {
        type: "post",
        id: input.id,
        slug: row?.slug,
        title: row?.title,
      });
    }),

  discard: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(post)
        .set({ draftLayout: null })
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)));
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const row = ctx.db
        .select({ title: post.title })
        .from(post)
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)))
        .get();
      await ctx.db
        .delete(post)
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)));
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "post.delete",
        entity: `post:${input.id}`,
        detail: `Deleted post "${row?.title ?? ""}"`,
      });
    }),

  duplicate: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const source = ctx.db
        .select()
        .from(post)
        .where(and(eq(post.siteId, ctx.siteId), eq(post.id, input.id)))
        .get();
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      const suffix = Date.now().toString(36);
      const [copy] = await ctx.db
        .insert(post)
        .values({
          siteId: ctx.siteId,
          title: `${source.title} (Copy)`,
          slug: `${source.slug}-copy-${suffix}`,
          excerpt: source.excerpt,
          coverImage: source.coverImage,
          layout: source.layout,
          draftLayout: source.draftLayout,
          status: "draft",
          category: source.category,
          kind: source.kind,
          byline: source.byline,
          sourceUrl: source.sourceUrl,
          authorId: ctx.session.user.id,
        })
        .returning({ id: post.id });
      return { id: copy!.id };
    }),
});
