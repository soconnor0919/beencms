import { randomUUID } from "crypto";
import { and, asc, desc, eq, gte, like, or } from "drizzle-orm";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod/v4";
import { db } from "~/server/db";
import { emitWebhook } from "~/lib/webhooks";
import {
  BUILT_IN_SITE_TEMPLATES,
  getBuiltInSiteTemplate,
} from "~/config/site-templates";
import { publishAllSiteDrafts } from "~/lib/publishing";
import { validateBlockLayout } from "~/lib/blocks";
import { normalizeMediaFolder } from "~/lib/media";
import { getSiteMediaUsage } from "~/lib/media-usage";
import { buildAnalyticsReport } from "~/lib/analytics-report";
import {
  analyticsEvent,
  analyticsSettings,
  auditLog,
  customForm,
  customFormSubmission,
  dynamicPage,
  mediaAsset,
  mediaVariant,
  post,
  pageLayout,
  sitePublication,
  siteTemplate,
  siteSettings,
} from "~/server/db/schema";

const json = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  structuredContent: { result: value },
});

async function audit(
  siteId: string,
  action: string,
  entity: string,
  detail: string,
) {
  await db.insert(auditLog).values({
    siteId,
    userEmail: "agent@hadlockcms.local",
    action,
    entity,
    detail,
  });
}

const pageStatus = z.enum([
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

export function createHadlockCmsMcpServer(siteId: string) {
  const server = new McpServer(
    { name: "hadlockCMS", version: "1.0.0" },
    {
      instructions:
        "Manage hadlockCMS content. Save changes as drafts first, inspect them, and only publish when the user explicitly asks. Destructive tools require confirm=true.",
    },
  );

  server.registerTool(
    "site_overview",
    { description: "Summarize the site and its manageable content." },
    async () => {
      const [settings, pages, posts, media, forms] = await Promise.all([
        db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, siteId))
          .get(),
        db
          .select({ id: dynamicPage.id })
          .from(dynamicPage)
          .where(eq(dynamicPage.siteId, siteId)),
        db.select({ id: post.id }).from(post).where(eq(post.siteId, siteId)),
        db
          .select({ id: mediaAsset.id })
          .from(mediaAsset)
          .where(eq(mediaAsset.siteId, siteId)),
        db
          .select({ id: customForm.id })
          .from(customForm)
          .where(eq(customForm.siteId, siteId)),
      ]);
      return json({
        settings,
        counts: {
          pages: pages.length,
          posts: posts.length,
          media: media.length,
          forms: forms.length,
        },
      });
    },
  );

  server.registerTool(
    "list_site_templates",
    {
      description:
        "List built-in full-site starters and templates saved in this site.",
    },
    async () => {
      const saved = await db
        .select({
          id: siteTemplate.id,
          name: siteTemplate.name,
          description: siteTemplate.description,
          category: siteTemplate.category,
        })
        .from(siteTemplate)
        .where(eq(siteTemplate.siteId, siteId))
        .orderBy(asc(siteTemplate.name));
      return json({
        builtIn: BUILT_IN_SITE_TEMPLATES.map(
          ({ id, name, description, category }) => ({
            id,
            name,
            description,
            category,
          }),
        ),
        saved,
      });
    },
  );

  server.registerTool(
    "stage_builtin_site_template",
    {
      description:
        "Stage a built-in full-site template as drafts. Published content remains live until publish_site is called.",
      inputSchema: z.object({
        templateId: z.string(),
        overwriteMatching: z.boolean().default(false),
        confirm: z.literal(true),
      }),
    },
    async ({ templateId, overwriteMatching }) => {
      const template = getBuiltInSiteTemplate(templateId);
      if (!template) throw new Error("Built-in template not found");
      let applied = 0;
      db.transaction((tx) => {
        tx.update(siteSettings)
          .set({ ...template.snapshot.settings, onboardingComplete: true })
          .where(eq(siteSettings.siteId, siteId))
          .run();
        for (const item of template.snapshot.layouts) {
          const existing = tx
            .select({ id: pageLayout.id })
            .from(pageLayout)
            .where(
              and(
                eq(pageLayout.siteId, siteId),
                eq(pageLayout.page, item.page),
              ),
            )
            .get();
          if (existing && !overwriteMatching) continue;
          const draftLayout = JSON.stringify(item.layout);
          tx.insert(pageLayout)
            .values({ siteId, page: item.page, layout: "[]", draftLayout })
            .onConflictDoUpdate({
              target: [pageLayout.siteId, pageLayout.page],
              set: { draftLayout },
            })
            .run();
          applied++;
        }
      });
      await audit(
        siteId,
        "mcp.template.stage",
        `site_template:${templateId}`,
        `${applied} layouts staged`,
      );
      return json({ templateId, layoutsApplied: applied, published: false });
    },
  );

  server.registerTool(
    "publication_history",
    { description: "List recent site-wide publication results." },
    async () =>
      json(
        await db
          .select()
          .from(sitePublication)
          .where(eq(sitePublication.siteId, siteId))
          .orderBy(desc(sitePublication.createdAt))
          .limit(20),
      ),
  );

  server.registerTool(
    "publish_site",
    {
      description:
        "Atomically publish all pending page, post, program, and content-field drafts for this site.",
      inputSchema: z.object({ confirm: z.literal(true) }),
    },
    async () =>
      json(
        await publishAllSiteDrafts({
          siteId,
          actorId: null,
          actorEmail: "agent@hadlockcms.local",
        }),
      ),
  );

  server.registerTool(
    "search_content",
    {
      description: "Search pages and posts, including drafts.",
      inputSchema: z.object({ query: z.string().min(2).max(100) }),
    },
    async ({ query }) => {
      const pattern = `%${query}%`;
      const [pages, posts] = await Promise.all([
        db
          .select()
          .from(dynamicPage)
          .where(
            and(
              eq(dynamicPage.siteId, siteId),
              or(
                like(dynamicPage.title, pattern),
                like(dynamicPage.seoDescription, pattern),
              ),
            ),
          )
          .limit(50),
        db
          .select()
          .from(post)
          .where(
            and(
              eq(post.siteId, siteId),
              or(like(post.title, pattern), like(post.excerpt, pattern)),
            ),
          )
          .limit(50),
      ]);
      return json({ pages, posts });
    },
  );

  server.registerTool(
    "list_pages",
    {
      description: "List dynamic pages and their workflow state.",
      inputSchema: z.object({
        locale: z.string().optional(),
        status: pageStatus.optional(),
      }),
    },
    async ({ locale, status }) => {
      const filters = [
        eq(dynamicPage.siteId, siteId),
        locale ? eq(dynamicPage.locale, locale) : undefined,
        status ? eq(dynamicPage.status, status) : undefined,
      ].filter(Boolean);
      return json(
        await db
          .select()
          .from(dynamicPage)
          .where(
            filters.length
              ? and(...(filters as Parameters<typeof and>))
              : undefined,
          )
          .orderBy(asc(dynamicPage.slug)),
      );
    },
  );

  server.registerTool(
    "get_page",
    {
      description: "Read a page with its published and draft block layouts.",
      inputSchema: z.object({ id: z.string() }),
    },
    async ({ id }) =>
      json(
        db
          .select()
          .from(dynamicPage)
          .where(and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, id)))
          .get() ?? null,
      ),
  );

  server.registerTool(
    "save_page_draft",
    {
      description: "Create or update a page draft. This does not publish it.",
      inputSchema: z.object({
        id: z.string().optional(),
        title: z.string().min(1).max(512),
        slug: z.string().regex(/^[a-z0-9][a-z0-9/-]*$/),
        locale: z.string().default("en-US"),
        parentId: z.string().nullable().optional(),
        blocks: z.array(z.unknown()),
        seoTitle: z.string().max(512).nullable().optional(),
        seoDescription: z.string().max(1000).nullable().optional(),
        canonical: z.string().url().nullable().optional(),
        noIndex: z.boolean().default(false),
      }),
    },
    async (input) => {
      validateBlockLayout(input.blocks);
      const id = input.id ?? randomUUID();
      const existing = db
        .select()
        .from(dynamicPage)
        .where(and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, id)))
        .get();
      if (input.id && !existing) throw new Error("Page not found in this site");
      const values = {
        id,
        siteId,
        title: input.title,
        slug: input.slug.replace(/^\/+|\/+$/g, ""),
        locale: input.locale,
        parentId: input.parentId ?? null,
        status: "draft" as const,
        layout: existing?.layout ?? "[]",
        draftLayout: JSON.stringify(input.blocks),
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        canonical: input.canonical ?? null,
        noIndex: input.noIndex,
      };
      await db
        .insert(dynamicPage)
        .values(values)
        .onConflictDoUpdate({ target: dynamicPage.id, set: values });
      await audit(
        siteId,
        "mcp.page.save_draft",
        `dynamic_page:${id}`,
        input.title,
      );
      return json({ id, status: "draft" });
    },
  );

  server.registerTool(
    "publish_page",
    {
      description: "Publish the current page draft.",
      inputSchema: z.object({ id: z.string() }),
      annotations: { destructiveHint: false },
    },
    async ({ id }) => {
      const page = db
        .select()
        .from(dynamicPage)
        .where(and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, id)))
        .get();
      if (!page) throw new Error("Page not found");
      await db
        .update(dynamicPage)
        .set({
          layout: page.draftLayout ?? page.layout,
          draftLayout: null,
          status: "published",
          publishAt: new Date(),
        })
        .where(and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, id)));
      await audit(siteId, "mcp.page.publish", `dynamic_page:${id}`, page.title);
      void emitWebhook(siteId, "content.published", {
        type: "page",
        id,
        slug: page.slug,
        title: page.title,
      });
      return json({ id, published: true });
    },
  );

  server.registerTool(
    "delete_page",
    {
      description: "Permanently delete a dynamic page.",
      inputSchema: z.object({ id: z.string(), confirm: z.literal(true) }),
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      await db
        .delete(dynamicPage)
        .where(and(eq(dynamicPage.siteId, siteId), eq(dynamicPage.id, id)));
      await audit(
        siteId,
        "mcp.page.delete",
        `dynamic_page:${id}`,
        "Deleted by agent",
      );
      return json({ id, deleted: true });
    },
  );

  server.registerTool(
    "list_posts",
    { description: "List all posts, including drafts and scheduled posts." },
    async () =>
      json(
        await db
          .select()
          .from(post)
          .where(eq(post.siteId, siteId))
          .orderBy(desc(post.createdAt)),
      ),
  );

  server.registerTool(
    "save_post_draft",
    {
      description: "Create or update a post draft without publishing it.",
      inputSchema: z.object({
        id: z.number().int().positive().optional(),
        title: z.string().min(1).max(512),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        excerpt: z.string().max(1000).nullable().optional(),
        coverImage: z.string().nullable().optional(),
        category: z.string().max(128).nullable().optional(),
        kind: z.enum(["news", "article"]).default("article"),
        byline: z.string().max(256).nullable().optional(),
        blocks: z.array(z.unknown()),
        seoTitle: z.string().max(512).nullable().optional(),
        seoDescription: z.string().max(1000).nullable().optional(),
        canonical: z.string().url().nullable().optional(),
        noIndex: z.boolean().default(false),
      }),
    },
    async (input) => {
      validateBlockLayout(input.blocks);
      const { id, blocks, ...metadata } = input;
      const values = {
        ...metadata,
        status: "draft" as const,
        draftLayout: JSON.stringify(blocks),
      };
      let postId = id;
      if (id)
        await db
          .update(post)
          .set(values)
          .where(and(eq(post.siteId, siteId), eq(post.id, id)));
      else {
        const row = await db
          .insert(post)
          .values({ ...values, siteId, layout: "[]" })
          .returning({ id: post.id });
        postId = row[0]!.id;
      }
      await audit(siteId, "mcp.post.save_draft", `post:${postId}`, input.title);
      return json({ id: postId, status: "draft" });
    },
  );

  server.registerTool(
    "publish_post",
    {
      description: "Publish the current post draft.",
      inputSchema: z.object({ id: z.number().int().positive() }),
    },
    async ({ id }) => {
      const item = db
        .select()
        .from(post)
        .where(and(eq(post.siteId, siteId), eq(post.id, id)))
        .get();
      if (!item) throw new Error("Post not found");
      await db
        .update(post)
        .set({
          layout: item.draftLayout ?? item.layout,
          draftLayout: null,
          status: "published",
          publishedAt: new Date(),
        })
        .where(and(eq(post.siteId, siteId), eq(post.id, id)));
      await audit(siteId, "mcp.post.publish", `post:${id}`, item.title);
      void emitWebhook(siteId, "content.published", {
        type: "post",
        id,
        slug: item.slug,
        title: item.title,
      });
      return json({ id, published: true });
    },
  );

  server.registerTool(
    "delete_post",
    {
      description: "Permanently delete a post.",
      inputSchema: z.object({
        id: z.number().int().positive(),
        confirm: z.literal(true),
      }),
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      await db
        .delete(post)
        .where(and(eq(post.siteId, siteId), eq(post.id, id)));
      await audit(siteId, "mcp.post.delete", `post:${id}`, "Deleted by agent");
      return json({ id, deleted: true });
    },
  );

  server.registerTool(
    "get_site_settings",
    {
      description:
        "Read branding, navigation, contact, theme, and SEO settings.",
    },
    async () =>
      json(
        db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, siteId))
          .get() ?? null,
      ),
  );

  server.registerTool(
    "update_site_settings",
    {
      description:
        "Update site identity, contact, theme, navigation, or default SEO settings.",
      inputSchema: z.object({
        siteName: z.string().min(1).optional(),
        siteUrl: z.string().url().nullable().optional(),
        logoUrl: z.string().nullable().optional(),
        primaryColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        accentColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        textColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        footerTagline: z.string().nullable().optional(),
        contactEmail: z.string().email().nullable().optional(),
        contactPhone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        seoTitle: z.string().nullable().optional(),
        seoDescription: z.string().nullable().optional(),
        navLinks: z
          .array(z.object({ label: z.string(), href: z.string() }))
          .optional(),
        socialLinks: z
          .array(z.object({ platform: z.string(), url: z.string().url() }))
          .optional(),
      }),
    },
    async (input) => {
      const current = db
        .select()
        .from(siteSettings)
        .where(eq(siteSettings.siteId, siteId))
        .get();
      const values = {
        ...input,
        navLinks: input.navLinks ? JSON.stringify(input.navLinks) : undefined,
        socialLinks: input.socialLinks
          ? JSON.stringify(input.socialLinks)
          : undefined,
      };
      if (current)
        await db
          .update(siteSettings)
          .set(values)
          .where(
            and(
              eq(siteSettings.siteId, siteId),
              eq(siteSettings.id, current.id),
            ),
          );
      else
        await db.insert(siteSettings).values({
          siteId,
          siteName: input.siteName ?? "New Site",
          ...values,
        });
      await audit(
        siteId,
        "mcp.settings.update",
        "site_settings",
        Object.keys(input).join(", "),
      );
      return json(
        db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, siteId))
          .get(),
      );
    },
  );

  server.registerTool(
    "list_media",
    { description: "List uploaded media and accessibility metadata." },
    async () =>
      json(
        await db
          .select()
          .from(mediaAsset)
          .where(eq(mediaAsset.siteId, siteId))
          .orderBy(desc(mediaAsset.createdAt)),
      ),
  );

  server.registerTool(
    "media_usage",
    {
      description:
        "Read this site's media asset, generated-variant, and storage quota usage.",
    },
    async () => json(await getSiteMediaUsage(siteId)),
  );

  server.registerTool(
    "get_media",
    {
      description: "Read one media asset and every optimized variant.",
      inputSchema: z.object({ id: z.number().int().positive() }),
    },
    async ({ id }) => {
      const asset = db
        .select()
        .from(mediaAsset)
        .where(and(eq(mediaAsset.siteId, siteId), eq(mediaAsset.id, id)))
        .get();
      if (!asset) throw new Error("Media asset not found");
      const variants = await db
        .select()
        .from(mediaVariant)
        .where(
          and(eq(mediaVariant.siteId, siteId), eq(mediaVariant.assetId, id)),
        );
      return json({ asset, variants });
    },
  );

  server.registerTool(
    "update_media_alt",
    {
      description: "Update image alternative text.",
      inputSchema: z.object({
        id: z.number().int().positive(),
        alt: z.string().max(1000),
      }),
    },
    async ({ id, alt }) => {
      await db
        .update(mediaAsset)
        .set({ alt })
        .where(and(eq(mediaAsset.siteId, siteId), eq(mediaAsset.id, id)));
      await audit(siteId, "mcp.media.update_alt", `media:${id}`, alt);
      return json({ id, alt });
    },
  );

  server.registerTool(
    "update_media_metadata",
    {
      description:
        "Update accessibility text, editorial metadata, folder, and focal point for an image.",
      inputSchema: z.object({
        id: z.number().int().positive(),
        alt: z.string().max(1000),
        title: z.string().max(512).nullable().optional(),
        caption: z.string().max(2000).nullable().optional(),
        folder: z.string().max(256).default(""),
        focalX: z.number().int().min(0).max(100).default(50),
        focalY: z.number().int().min(0).max(100).default(50),
      }),
    },
    async ({ id, folder, ...metadata }) => {
      const result = await db
        .update(mediaAsset)
        .set({ ...metadata, folder: normalizeMediaFolder(folder) })
        .where(and(eq(mediaAsset.siteId, siteId), eq(mediaAsset.id, id)));
      if (!result.changes) throw new Error("Media asset not found");
      await audit(siteId, "mcp.media.update", `media:${id}`, metadata.alt);
      return json({ id, updated: true });
    },
  );

  server.registerTool(
    "list_forms",
    { description: "List custom forms and their field definitions." },
    async () =>
      json(
        await db
          .select()
          .from(customForm)
          .where(eq(customForm.siteId, siteId))
          .orderBy(asc(customForm.name)),
      ),
  );

  server.registerTool(
    "list_form_submissions",
    {
      description: "List recent submissions for a custom form.",
      inputSchema: z.object({
        formId: z.string(),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    },
    async ({ formId, limit }) =>
      json(
        await db
          .select()
          .from(customFormSubmission)
          .innerJoin(customForm, eq(customFormSubmission.formId, customForm.id))
          .where(
            and(
              eq(customForm.siteId, siteId),
              eq(customFormSubmission.formId, formId),
            ),
          )
          .orderBy(desc(customFormSubmission.createdAt))
          .limit(limit),
      ),
  );

  server.registerTool(
    "get_analytics_report",
    {
      description:
        "Read privacy-conscious traffic, visitor, page, source, device, and conversion analytics for this site.",
      inputSchema: z.object({
        days: z.union([z.literal(7), z.literal(30), z.literal(90)]).default(30),
      }),
    },
    async ({ days }) => {
      const events = await db
        .select({
          kind: analyticsEvent.kind,
          name: analyticsEvent.name,
          path: analyticsEvent.path,
          referrer: analyticsEvent.referrer,
          visitorHash: analyticsEvent.visitorHash,
          device: analyticsEvent.device,
          createdAt: analyticsEvent.createdAt,
        })
        .from(analyticsEvent)
        .where(
          and(
            eq(analyticsEvent.siteId, siteId),
            gte(
              analyticsEvent.createdAt,
              new Date(Date.now() - days * 86_400_000),
            ),
          ),
        )
        .orderBy(asc(analyticsEvent.createdAt));
      return json(buildAnalyticsReport(events, days));
    },
  );

  server.registerTool(
    "update_analytics_settings",
    {
      description:
        "Enable or disable first-party analytics and set raw-event retention.",
      inputSchema: z.object({
        enabled: z.boolean(),
        retentionDays: z.union([z.literal(30), z.literal(90), z.literal(365)]),
      }),
    },
    async (input) => {
      await db
        .insert(analyticsSettings)
        .values({ siteId, ...input })
        .onConflictDoUpdate({
          target: analyticsSettings.siteId,
          set: input,
        });
      await audit(
        siteId,
        "mcp.analytics.settings",
        "analytics_settings",
        `${input.enabled ? "enabled" : "disabled"}, ${input.retentionDays} days`,
      );
      return json(input);
    },
  );

  return server;
}
