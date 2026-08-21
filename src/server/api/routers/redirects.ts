import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { redirects } from "~/server/db/schema";

export const redirectsRouter = createTRPCRouter({
  get: publicProcedure.input(z.object({ fromPath: z.string() })).query(
    ({ ctx, input }) =>
      ctx.db
        .select({ toPath: redirects.toPath })
        .from(redirects)
        .where(
          and(
            eq(redirects.siteId, ctx.siteId),
            eq(redirects.fromPath, input.fromPath),
          ),
        )
        .get() ?? null,
  ),
});
