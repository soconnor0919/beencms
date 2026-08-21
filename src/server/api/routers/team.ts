import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import { teamMembers, auditLog } from "~/server/db/schema";
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
    entity: "team",
    detail,
  });
}

export const teamRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.siteId, ctx.siteId))
      .orderBy(asc(teamMembers.order));
  }),

  upsert: editorProcedure
    .input(
      z.object({
        id: z.number().optional(),
        name: z.string().min(1),
        role: z.string().min(1),
        bio: z.string().optional(),
        imageUrl: z.string().optional(),
        order: z.number().default(0),
        isAffiliate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        await ctx.db
          .update(teamMembers)
          .set(data)
          .where(
            and(eq(teamMembers.siteId, ctx.siteId), eq(teamMembers.id, id)),
          );
        await writeAudit(ctx, "team.update", input.name);
      } else {
        await ctx.db
          .insert(teamMembers)
          .values({ ...data, siteId: ctx.siteId });
        await writeAudit(ctx, "team.create", input.name);
      }
    }),

  reorder: editorProcedure
    .input(z.array(z.object({ id: z.number(), order: z.number() })))
    .mutation(async ({ ctx, input }) => {
      await Promise.all(
        input.map(({ id, order }) =>
          ctx.db
            .update(teamMembers)
            .set({ order })
            .where(
              and(eq(teamMembers.siteId, ctx.siteId), eq(teamMembers.id, id)),
            ),
        ),
      );
      await writeAudit(ctx, "team.reorder");
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await ctx.db
        .select({ name: teamMembers.name })
        .from(teamMembers)
        .where(
          and(eq(teamMembers.siteId, ctx.siteId), eq(teamMembers.id, input.id)),
        )
        .get();
      await ctx.db
        .delete(teamMembers)
        .where(
          and(eq(teamMembers.siteId, ctx.siteId), eq(teamMembers.id, input.id)),
        );
      await writeAudit(ctx, "team.delete", member?.name);
    }),
});
