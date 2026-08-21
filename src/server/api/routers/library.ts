import { randomUUID } from "crypto";
import { and, asc, eq, like, lte, ne, or } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  editorProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  companies,
  dynamicPage,
  post,
  reusableBlock,
  taxonomyTerm,
  teamMembers,
} from "~/server/db/schema";

export const libraryRouter = createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(2).max(100),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const pattern = `%${input.query}%`;
      const now = new Date();
      const [posts, pages, programs, people] = await Promise.all([
        ctx.db
          .select({
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
          })
          .from(post)
          .where(
            and(
              eq(post.siteId, ctx.siteId),
              or(
                eq(post.status, "published"),
                and(eq(post.status, "scheduled"), lte(post.scheduledAt, now)),
              ),
              or(like(post.title, pattern), like(post.excerpt, pattern)),
            ),
          )
          .limit(input.limit),
        ctx.db
          .select({
            id: dynamicPage.id,
            title: dynamicPage.title,
            slug: dynamicPage.slug,
            excerpt: dynamicPage.seoDescription,
          })
          .from(dynamicPage)
          .where(
            and(
              eq(dynamicPage.siteId, ctx.siteId),
              or(
                eq(dynamicPage.status, "published"),
                and(
                  eq(dynamicPage.status, "scheduled"),
                  lte(dynamicPage.publishAt, now),
                ),
              ),
              or(
                like(dynamicPage.title, pattern),
                like(dynamicPage.seoDescription, pattern),
              ),
            ),
          )
          .limit(input.limit),
        ctx.db
          .select({
            id: companies.id,
            title: companies.name,
            slug: companies.slug,
            excerpt: companies.description,
          })
          .from(companies)
          .where(
            and(
              eq(companies.siteId, ctx.siteId),
              ne(companies.status, "archived"),
              or(
                like(companies.name, pattern),
                like(companies.description, pattern),
              ),
            ),
          )
          .limit(input.limit),
        ctx.db
          .select({
            id: teamMembers.id,
            title: teamMembers.name,
            slug: teamMembers.role,
            excerpt: teamMembers.bio,
          })
          .from(teamMembers)
          .where(
            and(
              eq(teamMembers.siteId, ctx.siteId),
              or(
                like(teamMembers.name, pattern),
                like(teamMembers.bio, pattern),
              ),
            ),
          )
          .limit(input.limit),
      ]);
      return [
        ...posts.map((item) => ({
          ...item,
          type: "post" as const,
          href: `/blog/${item.slug}`,
        })),
        ...pages.map((item) => ({
          ...item,
          type: "page" as const,
          href: `/${item.slug}`,
        })),
        ...programs.map((item) => ({
          ...item,
          type: "program" as const,
          href: `/programs/${item.slug}`,
        })),
        ...people.map((item) => ({
          ...item,
          type: "person" as const,
          href: "/team",
        })),
      ].slice(0, input.limit);
    }),

  reusable: editorProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(reusableBlock)
      .where(eq(reusableBlock.siteId, ctx.siteId))
      .orderBy(asc(reusableBlock.name)),
  ),
  saveReusable: editorProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(256),
        category: z.string().max(128).nullable().optional(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      JSON.parse(input.content);
      const id = input.id ?? randomUUID();
      if (input.id) {
        const existing = ctx.db.select({ id: reusableBlock.id }).from(reusableBlock).where(and(eq(reusableBlock.siteId, ctx.siteId), eq(reusableBlock.id, input.id))).get();
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db
        .insert(reusableBlock)
        .values({
          id,
          siteId: ctx.siteId,
          name: input.name,
          category: input.category ?? null,
          content: input.content,
          createdBy: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: reusableBlock.id,
          set: {
            name: input.name,
            category: input.category ?? null,
            content: input.content,
          },
        });
      return { id };
    }),
  deleteReusable: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(reusableBlock)
        .where(
          and(
            eq(reusableBlock.siteId, ctx.siteId),
            eq(reusableBlock.id, input.id),
          ),
        ),
    ),

  terms: editorProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(taxonomyTerm)
      .where(eq(taxonomyTerm.siteId, ctx.siteId))
      .orderBy(asc(taxonomyTerm.type), asc(taxonomyTerm.name)),
  ),
  saveTerm: editorProcedure
    .input(
      z.object({
        id: z.number().optional(),
        type: z.enum(["category", "tag"]),
        name: z.string().min(1).max(256),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        parentId: z.number().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id)
        await ctx.db
          .update(taxonomyTerm)
          .set(input)
          .where(
            and(
              eq(taxonomyTerm.siteId, ctx.siteId),
              eq(taxonomyTerm.id, input.id),
            ),
          );
      else
        await ctx.db
          .insert(taxonomyTerm)
          .values({ ...input, siteId: ctx.siteId });
    }),
  deleteTerm: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(taxonomyTerm)
        .where(
          and(
            eq(taxonomyTerm.siteId, ctx.siteId),
            eq(taxonomyTerm.id, input.id),
          ),
        ),
    ),
});
