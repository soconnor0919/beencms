import { randomUUID } from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  BUILT_IN_SITE_TEMPLATES,
  getBuiltInSiteTemplate,
  type SiteTemplateSnapshot,
} from "~/config/site-templates";
import { validateBlockLayout } from "~/lib/blocks";
import { createTRPCRouter, editorProcedure } from "~/server/api/trpc";
import {
  auditLog,
  dynamicPage,
  pageLayout,
  reusableBlock,
  siteSettings,
  siteTemplate,
} from "~/server/db/schema";

const snapshotSchema = z.object({
  version: z.literal(1),
  settings: z.object({
    themePreset: z.enum([
      "trellis",
      "editorial",
      "studio",
      "heritage",
      "sunrise",
      "noir",
      "signal",
    ]),
    layoutPreset: z.enum([
      "classic",
      "editorial",
      "photography",
      "technical",
      "projects",
    ]),
    headerStyle: z.enum(["standard", "centered", "minimal"]),
    footerStyle: z.enum(["columns", "centered", "minimal"]),
    sectionSpacing: z.enum(["compact", "balanced", "airy"]),
    buttonStyle: z.enum(["square", "rounded", "pill"]),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    bodyFont: z.string().min(1).max(80),
    headingFont: z.string().min(1).max(80),
    cornerStyle: z.enum(["square", "subtle", "rounded", "playful"]),
    contentAlignment: z.enum(["left", "center", "right"]),
    navLinks: z.string().max(20_000),
    footerTagline: z.string().max(1000).nullable(),
  }),
  layouts: z.array(
    z.object({
      page: z.string().min(1).max(128),
      layout: z.array(z.unknown()),
    }),
  ),
  pages: z.array(
    z.object({
      title: z.string().min(1).max(512),
      slug: z.string().min(1).max(512),
      locale: z.string().min(2).max(32),
      layout: z.array(z.unknown()),
      seoTitle: z.string().max(512).nullish(),
      seoDescription: z.string().max(1000).nullish(),
      noIndex: z.boolean().optional(),
    }),
  ),
  reusable: z.array(
    z.object({
      name: z.string().min(1).max(256),
      category: z.string().max(128).nullable(),
      content: z.array(z.unknown()),
    }),
  ),
});

function parseSnapshot(value: unknown): SiteTemplateSnapshot {
  const snapshot = snapshotSchema.parse(value);
  for (const item of snapshot.layouts) validateBlockLayout(item.layout);
  for (const item of snapshot.pages) validateBlockLayout(item.layout);
  for (const item of snapshot.reusable) validateBlockLayout(item.content);
  return snapshot as SiteTemplateSnapshot;
}

export const templatesRouter = createTRPCRouter({
  list: editorProcedure.query(async ({ ctx }) => {
    const custom = await ctx.db
      .select({
        id: siteTemplate.id,
        name: siteTemplate.name,
        description: siteTemplate.description,
        category: siteTemplate.category,
        thumbnailUrl: siteTemplate.thumbnailUrl,
        createdAt: siteTemplate.createdAt,
      })
      .from(siteTemplate)
      .where(eq(siteTemplate.siteId, ctx.siteId))
      .orderBy(asc(siteTemplate.name));
    return [
      ...BUILT_IN_SITE_TEMPLATES.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        thumbnailUrl: null,
        createdAt: null,
        builtIn: true,
      })),
      ...custom.map((item) => ({ ...item, builtIn: false })),
    ];
  }),

  capture: editorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().max(1000).nullish(),
        category: z.string().min(1).max(128).default("custom"),
        thumbnailUrl: z.string().url().nullish().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [settings, layouts, pages, reusable] = await Promise.all([
        ctx.db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, ctx.siteId))
          .get(),
        ctx.db
          .select()
          .from(pageLayout)
          .where(eq(pageLayout.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(dynamicPage)
          .where(eq(dynamicPage.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(reusableBlock)
          .where(eq(reusableBlock.siteId, ctx.siteId)),
      ]);
      if (!settings)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Complete site setup before saving a template.",
        });
      const snapshot: SiteTemplateSnapshot = {
        version: 1,
        settings: {
          themePreset: settings.themePreset,
          layoutPreset: settings.layoutPreset,
          headerStyle: settings.headerStyle,
          footerStyle: settings.footerStyle,
          sectionSpacing: settings.sectionSpacing,
          buttonStyle: settings.buttonStyle,
          primaryColor: settings.primaryColor,
          accentColor: settings.accentColor,
          textColor: settings.textColor,
          bodyFont: settings.bodyFont,
          headingFont: settings.headingFont,
          cornerStyle: settings.cornerStyle,
          contentAlignment: settings.contentAlignment,
          navLinks: settings.navLinks,
          footerTagline: settings.footerTagline,
        },
        layouts: layouts.map((item) => ({
          page: item.page,
          layout: validateBlockLayout(
            JSON.parse(item.draftLayout ?? item.layout),
          ),
        })),
        pages: pages.map((item) => ({
          title: item.title,
          slug: item.slug,
          locale: item.locale,
          layout: validateBlockLayout(
            JSON.parse(item.draftLayout ?? item.layout),
          ),
          seoTitle: item.seoTitle,
          seoDescription: item.seoDescription,
          noIndex: item.noIndex,
        })),
        reusable: reusable.map((item) => ({
          name: item.name,
          category: item.category,
          content: validateBlockLayout(
            JSON.parse(item.draftContent ?? item.content),
          ),
        })),
      };
      const id = randomUUID();
      await ctx.db.insert(siteTemplate).values({
        id,
        siteId: ctx.siteId,
        name: input.name,
        description: input.description || null,
        category: input.category,
        thumbnailUrl: input.thumbnailUrl || null,
        snapshot: JSON.stringify(snapshot),
        createdBy: ctx.session.user.id,
      });
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "template.capture",
        entity: `site_template:${id}`,
        detail: input.name,
      });
      return { id };
    }),

  stage: editorProcedure
    .input(
      z.object({
        id: z.string(),
        overwriteMatching: z.boolean().default(false),
        confirmation: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.overwriteMatching && input.confirmation !== "APPLY")
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Type APPLY to replace matching drafts.",
        });
      const builtIn = getBuiltInSiteTemplate(input.id);
      const saved = builtIn
        ? null
        : await ctx.db
            .select()
            .from(siteTemplate)
            .where(
              and(
                eq(siteTemplate.siteId, ctx.siteId),
                eq(siteTemplate.id, input.id),
              ),
            )
            .get();
      if (!builtIn && !saved) throw new TRPCError({ code: "NOT_FOUND" });
      const snapshot = parseSnapshot(
        builtIn?.snapshot ?? JSON.parse(saved!.snapshot),
      );
      const result = ctx.db.transaction((tx) => {
        tx.update(siteSettings)
          .set({ ...snapshot.settings, onboardingComplete: true })
          .where(eq(siteSettings.siteId, ctx.siteId))
          .run();
        let layoutsApplied = 0;
        let pagesApplied = 0;
        let sectionsApplied = 0;
        for (const item of snapshot.layouts) {
          const existing = tx
            .select({ id: pageLayout.id })
            .from(pageLayout)
            .where(
              and(
                eq(pageLayout.siteId, ctx.siteId),
                eq(pageLayout.page, item.page),
              ),
            )
            .get();
          if (existing && !input.overwriteMatching) continue;
          const draftLayout = JSON.stringify(item.layout);
          tx.insert(pageLayout)
            .values({
              siteId: ctx.siteId,
              page: item.page,
              layout: "[]",
              draftLayout,
            })
            .onConflictDoUpdate({
              target: [pageLayout.siteId, pageLayout.page],
              set: { draftLayout },
            })
            .run();
          layoutsApplied++;
        }
        for (const item of snapshot.pages) {
          const existing = tx
            .select({ id: dynamicPage.id })
            .from(dynamicPage)
            .where(
              and(
                eq(dynamicPage.siteId, ctx.siteId),
                eq(dynamicPage.slug, item.slug),
                eq(dynamicPage.locale, item.locale),
              ),
            )
            .get();
          if (existing && !input.overwriteMatching) continue;
          const draftLayout = JSON.stringify(item.layout);
          if (existing)
            tx.update(dynamicPage)
              .set({
                title: item.title,
                draftLayout,
                seoTitle: item.seoTitle ?? null,
                seoDescription: item.seoDescription ?? null,
                noIndex: item.noIndex ?? false,
              })
              .where(
                and(
                  eq(dynamicPage.siteId, ctx.siteId),
                  eq(dynamicPage.id, existing.id),
                ),
              )
              .run();
          else
            tx.insert(dynamicPage)
              .values({
                id: randomUUID(),
                siteId: ctx.siteId,
                title: item.title,
                slug: item.slug,
                locale: item.locale,
                status: "draft",
                layout: "[]",
                draftLayout,
                seoTitle: item.seoTitle ?? null,
                seoDescription: item.seoDescription ?? null,
                noIndex: item.noIndex ?? false,
                createdBy: ctx.session.user.id,
              })
              .run();
          pagesApplied++;
        }
        for (const item of snapshot.reusable) {
          const existing = tx
            .select({ id: reusableBlock.id })
            .from(reusableBlock)
            .where(
              and(
                eq(reusableBlock.siteId, ctx.siteId),
                eq(reusableBlock.name, item.name),
              ),
            )
            .get();
          if (existing && !input.overwriteMatching) continue;
          const content = JSON.stringify(item.content);
          tx.insert(reusableBlock)
            .values({
              id: existing?.id ?? randomUUID(),
              siteId: ctx.siteId,
              name: item.name,
              category: item.category,
              content,
              createdBy: ctx.session.user.id,
            })
            .onConflictDoUpdate({
              target: reusableBlock.id,
              set: { category: item.category, draftContent: content },
            })
            .run();
          sectionsApplied++;
        }
        tx.insert(auditLog)
          .values({
            siteId: ctx.siteId,
            userId: ctx.session.user.id,
            userEmail: ctx.session.user.email,
            action: "template.apply",
            entity: `site_template:${input.id}`,
            detail: `${layoutsApplied} layouts, ${pagesApplied} pages, ${sectionsApplied} sections`,
          })
          .run();
        return { layoutsApplied, pagesApplied, sectionsApplied };
      });
      return result;
    }),

  delete: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      if (input.id.startsWith("builtin:"))
        throw new TRPCError({ code: "BAD_REQUEST" });
      return ctx.db
        .delete(siteTemplate)
        .where(
          and(
            eq(siteTemplate.siteId, ctx.siteId),
            eq(siteTemplate.id, input.id),
          ),
        );
    }),
});
