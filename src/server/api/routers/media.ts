import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeMediaFolder } from "~/lib/media";
import { getSiteMediaUsage } from "~/lib/media-usage";
import { removeMedia } from "~/lib/storage";
import { createTRPCRouter, editorProcedure } from "~/server/api/trpc";
import {
  companies,
  companyPage,
  dynamicPage,
  mediaAsset,
  mediaVariant,
  pageContent,
  pageLayout,
  pageSeo,
  post,
  auditLog,
  reusableBlock,
  siteSettings,
  siteTemplate,
  teamMembers,
} from "~/server/db/schema";

const metadataInput = z.object({
  id: z.number().int().positive(),
  alt: z.string().max(1000),
  title: z.string().max(512).nullish(),
  caption: z.string().max(2000).nullish(),
  folder: z.string().max(256).default(""),
  focalX: z.number().int().min(0).max(100).default(50),
  focalY: z.number().int().min(0).max(100).default(50),
});

export const mediaRouter = createTRPCRouter({
  getAll: editorProcedure
    .input(
      z
        .object({
          query: z.string().max(100).default(""),
          folder: z.string().max(256).nullable().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const query = input?.query.trim() ?? "";
      const folder =
        input?.folder === undefined || input.folder === null
          ? null
          : normalizeMediaFolder(input.folder);
      const [assets, variants] = await Promise.all([
        ctx.db
          .select()
          .from(mediaAsset)
          .where(
            and(
              eq(mediaAsset.siteId, ctx.siteId),
              folder === null ? undefined : eq(mediaAsset.folder, folder),
              query
                ? or(
                    like(mediaAsset.filename, `%${query}%`),
                    like(mediaAsset.alt, `%${query}%`),
                    like(mediaAsset.title, `%${query}%`),
                    like(mediaAsset.caption, `%${query}%`),
                  )
                : undefined,
            ),
          )
          .orderBy(desc(mediaAsset.createdAt)),
        ctx.db
          .select()
          .from(mediaVariant)
          .where(eq(mediaVariant.siteId, ctx.siteId))
          .orderBy(asc(mediaVariant.assetId), asc(mediaVariant.id)),
      ]);
      const byAsset = new Map<number, typeof variants>();
      for (const variant of variants) {
        const current = byAsset.get(variant.assetId) ?? [];
        current.push(variant);
        byAsset.set(variant.assetId, current);
      }
      return assets.map((asset) => ({
        ...asset,
        variants: byAsset.get(asset.id) ?? [],
      }));
    }),

  stats: editorProcedure.query(async ({ ctx }) => {
    const [usage, folders] = await Promise.all([
      getSiteMediaUsage(ctx.siteId),
      ctx.db
        .select({ folder: mediaAsset.folder })
        .from(mediaAsset)
        .where(eq(mediaAsset.siteId, ctx.siteId))
        .groupBy(mediaAsset.folder)
        .orderBy(asc(mediaAsset.folder)),
    ]);
    return { ...usage, folders: folders.map((item) => item.folder) };
  }),

  update: editorProcedure
    .input(metadataInput)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(mediaAsset)
        .set({
          alt: input.alt,
          title: input.title || null,
          caption: input.caption || null,
          folder: normalizeMediaFolder(input.folder),
          focalX: input.focalX,
          focalY: input.focalY,
        })
        .where(
          and(eq(mediaAsset.siteId, ctx.siteId), eq(mediaAsset.id, input.id)),
        );
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "media.update",
        entity: `media:${input.id}`,
        detail: `Updated metadata for media ${input.id}`,
      });
      return result;
    }),

  updateAlt: editorProcedure
    .input(z.object({ id: z.number(), alt: z.string().max(1000) }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .update(mediaAsset)
        .set({ alt: input.alt })
        .where(
          and(eq(mediaAsset.siteId, ctx.siteId), eq(mediaAsset.id, input.id)),
        ),
    ),

  moveMany: editorProcedure
    .input(
      z.object({
        ids: z.array(z.number().int().positive()).min(1).max(500),
        folder: z.string().max(256),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const folder = normalizeMediaFolder(input.folder);
      await ctx.db
        .update(mediaAsset)
        .set({ folder })
        .where(
          and(
            eq(mediaAsset.siteId, ctx.siteId),
            inArray(mediaAsset.id, input.ids),
          ),
        );
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "media.move",
        entity: "media",
        detail: `Moved ${input.ids.length} assets to ${folder || "root"}`,
      });
      return { moved: input.ids.length, folder };
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const asset = ctx.db
        .select()
        .from(mediaAsset)
        .where(
          and(eq(mediaAsset.siteId, ctx.siteId), eq(mediaAsset.id, input.id)),
        )
        .get();
      if (!asset) throw new TRPCError({ code: "NOT_FOUND" });

      const sources = await Promise.all([
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
          .from(companyPage)
          .where(eq(companyPage.siteId, ctx.siteId)),
        ctx.db.select().from(post).where(eq(post.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(siteSettings)
          .where(eq(siteSettings.siteId, ctx.siteId)),
        ctx.db.select().from(pageSeo).where(eq(pageSeo.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(pageContent)
          .where(eq(pageContent.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.siteId, ctx.siteId)),
        ctx.db.select().from(companies).where(eq(companies.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(reusableBlock)
          .where(eq(reusableBlock.siteId, ctx.siteId)),
        ctx.db
          .select()
          .from(siteTemplate)
          .where(eq(siteTemplate.siteId, ctx.siteId)),
      ]);
      if (JSON.stringify(sources).includes(asset.url))
        throw new TRPCError({
          code: "CONFLICT",
          message: "This image is still used by published or draft content.",
        });

      const variants = await ctx.db
        .select({ storageKey: mediaVariant.storageKey })
        .from(mediaVariant)
        .where(
          and(
            eq(mediaVariant.siteId, ctx.siteId),
            eq(mediaVariant.assetId, asset.id),
          ),
        );
      const keys = variants.length
        ? variants.map((item) => item.storageKey)
        : asset.storageKey
          ? [asset.storageKey]
          : asset.url.startsWith("/uploads/")
            ? [asset.url.replace(/^\//, "")]
            : [];
      for (const key of keys) await removeMedia(key);
      await ctx.db
        .delete(mediaAsset)
        .where(
          and(eq(mediaAsset.siteId, ctx.siteId), eq(mediaAsset.id, asset.id)),
        );
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "media.delete",
        entity: `media:${asset.id}`,
        detail: `Deleted ${asset.filename} and ${keys.length} stored files`,
      });
      return { deleted: true, filesDeleted: keys.length };
    }),
});
