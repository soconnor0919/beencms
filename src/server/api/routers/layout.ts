import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import { pageLayout, auditLog, contentRevision } from "~/server/db/schema";
import type { Block } from "~/lib/blocks";

export const layoutRouter = createTRPCRouter({
  /** Published layout only. Safe for public pages and unauthenticated API callers. */
  getPage: publicProcedure
    .input(z.object({ page: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = ctx.db
        .select()
        .from(pageLayout)
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        )
        .get();
      return {
        layout: (row ? JSON.parse(row.layout) : []) as Block[],
      };
    }),

  /** Published and draft layouts for the admin editor and authenticated preview. */
  getPageDraft: editorProcedure
    .input(z.object({ page: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = ctx.db
        .select()
        .from(pageLayout)
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        )
        .get();
      return {
        layout: (row ? JSON.parse(row.layout) : []) as Block[],
        draftLayout: row?.draftLayout
          ? (JSON.parse(row.draftLayout) as Block[])
          : null,
      };
    }),

  saveDraft: editorProcedure
    .input(z.object({ page: z.string(), blocks: z.array(z.unknown()) }))
    .mutation(async ({ ctx, input }) => {
      const json = JSON.stringify(input.blocks);
      const existing = ctx.db
        .select()
        .from(pageLayout)
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        )
        .get();
      if (existing) {
        await ctx.db
          .update(pageLayout)
          .set({ draftLayout: json })
          .where(
            and(
              eq(pageLayout.siteId, ctx.siteId),
              eq(pageLayout.page, input.page),
            ),
          );
      } else {
        await ctx.db
          .insert(pageLayout)
          .values({
            siteId: ctx.siteId,
            page: input.page,
            layout: "[]",
            draftLayout: json,
          });
      }
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "content.save",
        entity: `page:${input.page}`,
        detail: `Saved draft for ${input.page}`,
      });
    }),

  publish: editorProcedure
    .input(z.object({ page: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = ctx.db
        .select()
        .from(pageLayout)
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        )
        .get();
      if (!row?.draftLayout) return;
      await ctx.db
        .update(pageLayout)
        .set({ layout: sql`${pageLayout.draftLayout}`, draftLayout: null })
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        );
      await ctx.db.insert(contentRevision).values({
        siteId: ctx.siteId,
        entityType: "page",
        entityId: input.page,
        snapshot: JSON.stringify({ layout: row.draftLayout }),
        createdBy: ctx.session.user.id,
        createdEmail: ctx.session.user.email,
      });
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "content.publish",
        entity: `page:${input.page}`,
        detail: `Published ${input.page}`,
      });
    }),

  discard: editorProcedure
    .input(z.object({ page: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(pageLayout)
        .set({ draftLayout: null })
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.page),
          ),
        );
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "content.discard",
        entity: `page:${input.page}`,
        detail: `Discarded draft for ${input.page}`,
      });
    }),

  duplicate: editorProcedure
    .input(z.object({ sourcePage: z.string(), targetPage: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const source = ctx.db
        .select()
        .from(pageLayout)
        .where(
          and(
            eq(pageLayout.siteId, ctx.siteId),
            eq(pageLayout.page, input.sourcePage),
          ),
        )
        .get();
      if (!source) return;
      const draftLayout = source.draftLayout ?? source.layout;
      await ctx.db
        .insert(pageLayout)
        .values({
          siteId: ctx.siteId,
          page: input.targetPage,
          layout: "[]",
          draftLayout,
        })
        .onConflictDoUpdate({
          target: [pageLayout.siteId, pageLayout.page],
          set: { draftLayout },
        });
    }),
});
