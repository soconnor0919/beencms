import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import { pageSeo } from "~/server/db/schema";

const seoInput = z.object({
  page: z.string().min(1).max(128),
  title: z.string().max(512).nullish(),
  description: z.string().max(1000).nullish(),
  ogImage: z.string().nullish(),
  canonical: z.string().url().nullish(),
  noIndex: z.boolean().default(false),
});

export const seoRouter = createTRPCRouter({
  get: publicProcedure.input(z.object({ page: z.string() })).query(
    ({ ctx, input }) =>
      ctx.db
        .select()
        .from(pageSeo)
        .where(
          and(eq(pageSeo.siteId, ctx.siteId), eq(pageSeo.page, input.page)),
        )
        .get() ?? null,
  ),
  update: editorProcedure.input(seoInput).mutation(({ ctx, input }) =>
    ctx.db
      .insert(pageSeo)
      .values({ ...input, siteId: ctx.siteId })
      .onConflictDoUpdate({
        target: [pageSeo.siteId, pageSeo.page],
        set: input,
      }),
  ),
});
