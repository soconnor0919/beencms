import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, editorProcedure } from "~/server/api/trpc";
import {
  companyPage,
  contentRevision,
  dynamicPage,
  pageLayout,
  post,
} from "~/server/db/schema";

const entity = z.object({
  entityType: z.enum(["page", "company", "post"]),
  entityId: z.string(),
});

export const revisionsRouter = createTRPCRouter({
  getAll: editorProcedure.input(entity).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(contentRevision)
      .where(
        and(
          eq(contentRevision.siteId, ctx.siteId),
          eq(contentRevision.entityType, input.entityType),
          eq(contentRevision.entityId, input.entityId),
        ),
      )
      .orderBy(desc(contentRevision.createdAt))
      .limit(30),
  ),

  restore: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const revision = ctx.db
        .select()
        .from(contentRevision)
        .where(
          and(
            eq(contentRevision.siteId, ctx.siteId),
            eq(contentRevision.id, input.id),
          ),
        )
        .get();
      if (!revision) throw new TRPCError({ code: "NOT_FOUND" });
      const snapshot = JSON.parse(revision.snapshot) as { layout?: string };
      if (!snapshot.layout)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Revision has no layout.",
        });

      if (revision.entityType === "page") {
        if (revision.entityId.startsWith("dynamic:")) {
          await ctx.db
            .update(dynamicPage)
            .set({ draftLayout: snapshot.layout })
            .where(
              and(
                eq(dynamicPage.siteId, ctx.siteId),
                eq(dynamicPage.id, revision.entityId.slice(8)),
              ),
            );
        } else {
          await ctx.db
            .update(pageLayout)
            .set({ draftLayout: snapshot.layout })
            .where(
              and(
                eq(pageLayout.siteId, ctx.siteId),
                eq(pageLayout.page, revision.entityId),
              ),
            );
        }
      } else if (revision.entityType === "company") {
        await ctx.db
          .update(companyPage)
          .set({ draftLayout: snapshot.layout })
          .where(
            and(
              eq(companyPage.siteId, ctx.siteId),
              eq(companyPage.companyId, Number(revision.entityId)),
            ),
          );
      } else {
        await ctx.db
          .update(post)
          .set({ draftLayout: snapshot.layout })
          .where(
            and(
              eq(post.siteId, ctx.siteId),
              eq(post.id, Number(revision.entityId)),
            ),
          );
      }
    }),
});
