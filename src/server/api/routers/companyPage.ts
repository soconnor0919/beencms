import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import {
  companyPage,
  companies,
  auditLog,
  contentRevision,
} from "~/server/db/schema";

export const companyPageRouter = createTRPCRouter({
  /** Get page content for the admin editor (by company id). */
  getByCompanyId: editorProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db
        .select()
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, input.companyId),
          ),
        )
        .get();
      return (
        row ?? {
          id: 0,
          companyId: input.companyId,
          layout: "[]",
          draftLayout: null,
          updatedAt: null,
        }
      );
    }),

  /** Get published page content for a company (by slug). */
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db
        .select({ id: companies.id })
        .from(companies)
        .where(
          and(eq(companies.siteId, ctx.siteId), eq(companies.slug, input.slug)),
        )
        .get();
      if (!company) return null;
      const row = await ctx.db
        .select({
          id: companyPage.id,
          companyId: companyPage.companyId,
          layout: companyPage.layout,
          updatedAt: companyPage.updatedAt,
        })
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, company.id),
          ),
        )
        .get();
      return (
        row ?? { id: 0, companyId: company.id, layout: "[]", updatedAt: null }
      );
    }),

  /** Get published and draft page content for authenticated preview. */
  getDraftBySlug: editorProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db
        .select({ id: companies.id })
        .from(companies)
        .where(
          and(eq(companies.siteId, ctx.siteId), eq(companies.slug, input.slug)),
        )
        .get();
      if (!company) return null;
      const row = await ctx.db
        .select()
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, company.id),
          ),
        )
        .get();
      return (
        row ?? {
          id: 0,
          companyId: company.id,
          layout: "[]",
          draftLayout: null,
          updatedAt: null,
        }
      );
    }),

  /** Save published layout */
  save: editorProcedure
    .input(
      z.object({
        companyId: z.number(),
        layout: z.string(),
        draftLayout: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: companyPage.id })
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, input.companyId),
          ),
        )
        .get();
      if (existing) {
        await ctx.db
          .update(companyPage)
          .set({ layout: input.layout, draftLayout: input.draftLayout ?? null })
          .where(
            and(
              eq(companyPage.siteId, ctx.siteId),
              eq(companyPage.companyId, input.companyId),
            ),
          )
          .run();
      } else {
        await ctx.db
          .insert(companyPage)
          .values({
            siteId: ctx.siteId,
            companyId: input.companyId,
            layout: input.layout,
            draftLayout: input.draftLayout ?? null,
          })
          .run();
      }
      await ctx.db.insert(contentRevision).values({
        siteId: ctx.siteId,
        entityType: "company",
        entityId: String(input.companyId),
        snapshot: JSON.stringify({ layout: input.layout }),
        createdBy: ctx.session.user.id,
        createdEmail: ctx.session.user.email,
      });
      const company = ctx.db
        .select({ name: companies.name })
        .from(companies)
        .where(
          and(
            eq(companies.siteId, ctx.siteId),
            eq(companies.id, input.companyId),
          ),
        )
        .get();
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "content.publish",
        entity: `company:${input.companyId}`,
        detail: `Published page for ${company?.name ?? `company #${input.companyId}`}`,
      });
    }),

  /** Save draft only */
  saveDraft: editorProcedure
    .input(z.object({ companyId: z.number(), draftLayout: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: companyPage.id })
        .from(companyPage)
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, input.companyId),
          ),
        )
        .get();
      if (existing) {
        await ctx.db
          .update(companyPage)
          .set({ draftLayout: input.draftLayout })
          .where(
            and(
              eq(companyPage.siteId, ctx.siteId),
              eq(companyPage.companyId, input.companyId),
            ),
          )
          .run();
      } else {
        await ctx.db
          .insert(companyPage)
          .values({
            siteId: ctx.siteId,
            companyId: input.companyId,
            layout: "[]",
            draftLayout: input.draftLayout,
          })
          .run();
      }
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "content.save",
        entity: `company:${input.companyId}`,
        detail: `Saved draft for company #${input.companyId}`,
      });
    }),

  discard: editorProcedure
    .input(z.object({ companyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(companyPage)
        .set({ draftLayout: null })
        .where(
          and(
            eq(companyPage.siteId, ctx.siteId),
            eq(companyPage.companyId, input.companyId),
          ),
        );
      await ctx.db
        .insert(auditLog)
        .values({
          siteId: ctx.siteId,
          userId: ctx.session.user.id,
          userEmail: ctx.session.user.email,
          action: "content.discard",
          entity: `company:${input.companyId}`,
          detail: `Discarded draft for company #${input.companyId}`,
        });
    }),
});
