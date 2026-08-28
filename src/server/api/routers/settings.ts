import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "~/server/api/trpc";
import { siteSettings, auditLog, pageLayout } from "~/server/db/schema";
import { getLayoutPreset, getSiteTheme } from "~/config/themes";
import { features } from "~/config/cms";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";
import { getStarterBlocks } from "~/config/starters";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.siteId, ctx.siteId))
      .get();
    if (!row) {
      return {
        id: 0,
        siteId: ctx.siteId,
        siteName: "New Site",
        siteUrl: null,
        logoUrl: null,
        iconUrl: null,
        themePreset: "foundation" as const,
        cornerStyle: "rounded" as const,
        contentAlignment: "left" as const,
        layoutPreset: "classic" as const,
        headerStyle: "standard" as const,
        footerStyle: "columns" as const,
        sectionSpacing: "balanced" as const,
        buttonStyle: "rounded" as const,
        onboardingComplete: false,
        primaryColor: "#0076a0",
        accentColor: "#f4f1ea",
        textColor: "#171716",
        bodyFont: "Geist",
        headingFont: "Rajdhani",
        navLinks: "[]",
        footerTagline: null,
        contactEmail: null,
        contactPhone: null,
        address: null,
        socialLinks: "[]",
        seoTitle: null,
        seoDescription: null,
        updatedAt: null,
      };
    }
    return row;
  }),

  update: adminProcedure
    .input(
      z.object({
        siteName: z.string().min(1),
        siteUrl: z.string().url().nullish(),
        logoUrl: z.string().nullish(),
        iconUrl: z.string().nullish(),
        themePreset: z
          .enum([
            "foundation",
            "editorial",
            "studio",
            "heritage",
            "sunrise",
            "noir",
            "signal",
          ])
          .default("foundation"),
        cornerStyle: z
          .enum(["square", "subtle", "rounded", "playful"])
          .default("rounded"),
        contentAlignment: z.enum(["left", "center", "right"]).default("left"),
        layoutPreset: z
          .enum([
            "classic",
            "editorial",
            "photography",
            "technical",
            "projects",
          ])
          .default("classic"),
        headerStyle: z
          .enum(["standard", "centered", "minimal"])
          .default("standard"),
        footerStyle: z
          .enum(["columns", "centered", "minimal"])
          .default("columns"),
        sectionSpacing: z
          .enum(["compact", "balanced", "airy"])
          .default("balanced"),
        buttonStyle: z.enum(["square", "rounded", "pill"]).default("rounded"),
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        bodyFont: z.string(),
        headingFont: z.string(),
        navLinks: z.string().default("[]"),
        footerTagline: z.string().nullish(),
        contactEmail: z.string().email().nullish().or(z.literal("")),
        contactPhone: z.string().nullish(),
        address: z.string().nullish(),
        socialLinks: z.string().default("[]"),
        seoTitle: z.string().nullish(),
        seoDescription: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select({ id: siteSettings.id })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, ctx.siteId))
        .get();
      if (existing) {
        await ctx.db
          .update(siteSettings)
          .set(input)
          .where(eq(siteSettings.siteId, ctx.siteId))
          .run();
      } else {
        await ctx.db
          .insert(siteSettings)
          .values({ ...input, siteId: ctx.siteId })
          .run();
      }
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "settings.update",
        entity: "site_settings",
        detail: input.siteName,
      });
    }),
  completeOnboarding: adminProcedure
    .input(
      z.object({
        siteName: z.string().min(1).max(256),
        siteUrl: z.string().url().nullish().or(z.literal("")),
        footerTagline: z.string().max(500).nullish(),
        themePreset: z.enum([
          "foundation",
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
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        bodyFont: z.string().min(1).max(80),
        headingFont: z.string().min(1).max(80),
        cornerStyle: z.enum(["square", "subtle", "rounded", "playful"]),
        contentAlignment: z.enum(["left", "center", "right"]),
        sections: z
          .array(
            z.enum([
              "about",
              "team",
              "programs",
              "blog",
              "events",
              "contact",
              "donate",
            ]),
          )
          .min(1),
        contactEmail: z.string().email().nullish().or(z.literal("")),
        contactPhone: z.string().max(100).nullish(),
        address: z.string().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const theme = getSiteTheme(input.themePreset);
      const layout = getLayoutPreset(input.layoutPreset);
      const available = new Set([
        "about",
        "donate",
        ...(features.team ? ["team"] : []),
        ...(features.programs ? ["programs"] : []),
        ...(features.blog ? ["blog"] : []),
        ...(features.calendar ? ["events"] : []),
        ...(features.messages ? ["contact"] : []),
      ]);
      const definitions = {
        about: { label: "About", href: "/about" },
        team: { label: "Team", href: "/team" },
        programs: { label: "Programs", href: "/programs" },
        blog: { label: "News", href: "/blog" },
        events: { label: "Events", href: "/events" },
        contact: { label: "Contact", href: "/contact" },
        donate: { label: "Donate", href: "/donate" },
      } as const;
      const navLinks = input.sections
        .filter((section) => available.has(section))
        .map((section) => definitions[section]);
      const values = {
        siteName: input.siteName,
        siteUrl: input.siteUrl || null,
        footerTagline: input.footerTagline || null,
        themePreset: theme.id,
        layoutPreset: layout.id,
        headerStyle: layout.headerStyle,
        footerStyle: layout.footerStyle,
        sectionSpacing: layout.sectionSpacing,
        buttonStyle: layout.buttonStyle,
        primaryColor: input.primaryColor,
        accentColor: input.accentColor,
        textColor: input.textColor,
        bodyFont: input.bodyFont,
        headingFont: input.headingFont,
        cornerStyle: input.cornerStyle,
        contentAlignment: input.contentAlignment,
        navLinks: JSON.stringify(navLinks),
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone || null,
        address: input.address || null,
        onboardingComplete: true,
      };
      const existing = ctx.db
        .select({ id: siteSettings.id })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, ctx.siteId))
        .get();
      if (existing)
        await ctx.db
          .update(siteSettings)
          .set(values)
          .where(eq(siteSettings.siteId, ctx.siteId))
          .run();
      else
        await ctx.db
          .insert(siteSettings)
          .values({ ...values, siteId: ctx.siteId })
          .run();
      const home = ctx.db
        .select({ id: pageLayout.id })
        .from(pageLayout)
        .where(
          and(eq(pageLayout.siteId, ctx.siteId), eq(pageLayout.page, "home")),
        )
        .get();
      if (!home)
        await ctx.db.insert(pageLayout).values({
          siteId: ctx.siteId,
          page: "home",
          layout: JSON.stringify(getStarterBlocks(layout.id, input.siteName)),
        });
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "onboarding.complete",
        entity: "site_settings",
        detail: `Configured ${input.siteName} with ${theme.name}`,
      });
      return { success: true };
    }),
});
