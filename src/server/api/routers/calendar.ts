import { and, asc, eq, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  editorProcedure,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { auditLog, calendarEvent } from "~/server/db/schema";

const eventInput = z
  .object({
    id: z.number().optional(),
    title: z.string().min(1).max(512),
    description: z.string().max(5000).nullish(),
    location: z.string().max(1000).nullish(),
    url: z.string().url().nullish(),
    startAt: z.date(),
    endAt: z.date(),
    allDay: z.boolean().default(false),
    status: z.enum(["draft", "published"]).default("draft"),
  })
  .refine((value) => value.endAt >= value.startAt, {
    message: "End time must be after the start time.",
    path: ["endAt"],
  });

export const calendarRouter = createTRPCRouter({
  getUpcoming: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(calendarEvent)
        .where(
          and(
            eq(calendarEvent.siteId, ctx.siteId),
            eq(calendarEvent.status, "published"),
            gte(calendarEvent.endAt, new Date()),
          ),
        )
        .orderBy(asc(calendarEvent.startAt))
        .limit(input.limit)
        .all(),
    ),
  getAllForEditor: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(calendarEvent)
      .where(eq(calendarEvent.siteId, ctx.siteId))
      .orderBy(asc(calendarEvent.startAt)),
  ),
  upsert: editorProcedure.input(eventInput).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;
    let eventId = id;
    if (id)
      await ctx.db
        .update(calendarEvent)
        .set(values)
        .where(
          and(eq(calendarEvent.siteId, ctx.siteId), eq(calendarEvent.id, id)),
        );
    else {
      const [created] = await ctx.db
        .insert(calendarEvent)
        .values({ ...values, siteId: ctx.siteId })
        .returning({ id: calendarEvent.id });
      eventId = created!.id;
    }
    await ctx.db
      .insert(auditLog)
      .values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: id ? "calendar.update" : "calendar.create",
        entity: `event:${eventId}`,
        detail: values.title,
      });
    return { id: eventId! };
  }),
  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const item = ctx.db
        .select()
        .from(calendarEvent)
        .where(
          and(
            eq(calendarEvent.siteId, ctx.siteId),
            eq(calendarEvent.id, input.id),
          ),
        )
        .get();
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db
        .delete(calendarEvent)
        .where(
          and(
            eq(calendarEvent.siteId, ctx.siteId),
            eq(calendarEvent.id, input.id),
          ),
        );
      await ctx.db
        .insert(auditLog)
        .values({
          siteId: ctx.siteId,
          userId: ctx.session.user.id,
          userEmail: ctx.session.user.email,
          action: "calendar.delete",
          entity: `event:${input.id}`,
          detail: item.title,
        });
    }),
});
