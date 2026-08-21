import { z } from "zod";
import { and, eq, asc, ne } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import { companies, auditLog, redirects } from "~/server/db/schema";
import type { db as dbType } from "~/server/db";

type Ctx = {
  db: typeof dbType;
  session: { user: { id: string; email: string } };
  siteId: string;
};

function writeAudit(ctx: Ctx, action: string, detail?: string) {
  return ctx.db.insert(auditLog).values({
    siteId: ctx.siteId,
    userId: ctx.session.user.id,
    userEmail: ctx.session.user.email,
    action,
    entity: "company",
    detail,
  });
}

export const companiesRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select()
      .from(companies)
      .where(
        and(eq(companies.siteId, ctx.siteId), ne(companies.status, "archived")),
      )
      .orderBy(asc(companies.order));
  }),

  getAllForEditor: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(companies)
      .where(eq(companies.siteId, ctx.siteId))
      .orderBy(asc(companies.order)),
  ),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.db
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.siteId, ctx.siteId),
            eq(companies.slug, input.slug),
            ne(companies.status, "archived"),
          ),
        )
        .get();
    }),

  upsert: editorProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9-]+$/),
        tagline: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        seoTitle: z.string().max(512).nullish(),
        seoDescription: z.string().max(1000).nullish(),
        ogImage: z.string().nullish(),
        canonical: z.string().url().nullish(),
        noIndex: z.boolean().default(false),
        status: z.enum(["active", "coming_soon", "archived"]).default("active"),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        const existing = ctx.db
          .select({ slug: companies.slug })
          .from(companies)
          .where(and(eq(companies.siteId, ctx.siteId), eq(companies.id, id)))
          .get();
        await ctx.db
          .update(companies)
          .set(data)
          .where(and(eq(companies.siteId, ctx.siteId), eq(companies.id, id)));
        if (existing && existing.slug !== data.slug) {
          await ctx.db
            .insert(redirects)
            .values({
              siteId: ctx.siteId,
              fromPath: `/programs/${existing.slug}`,
              toPath: `/programs/${data.slug}`,
            })
            .onConflictDoUpdate({
              target: [redirects.siteId, redirects.fromPath],
              set: { toPath: `/programs/${data.slug}` },
            });
        }
        await writeAudit(ctx, "company.update", input.name);
      } else {
        await ctx.db.insert(companies).values({ ...data, siteId: ctx.siteId });
        await writeAudit(ctx, "company.create", input.name);
      }
    }),

  reorder: editorProcedure
    .input(z.array(z.object({ id: z.number(), order: z.number() })))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.map(({ id, order }) =>
          ctx.db
            .update(companies)
            .set({ order })
            .where(and(eq(companies.siteId, ctx.siteId), eq(companies.id, id))),
        ),
      );
      await writeAudit(ctx, "company.reorder");
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const company = await ctx.db
        .select({ name: companies.name })
        .from(companies)
        .where(
          and(eq(companies.siteId, ctx.siteId), eq(companies.id, input.id)),
        )
        .get();
      await ctx.db
        .delete(companies)
        .where(
          and(eq(companies.siteId, ctx.siteId), eq(companies.id, input.id)),
        );
      await writeAudit(ctx, "company.delete", company?.name);
    }),
});
