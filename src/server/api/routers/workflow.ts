import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createTRPCRouter,
  editorProcedure,
  reviewerProcedure,
} from "~/server/api/trpc";
import {
  auditLog,
  editorialComment,
  editorialWorkflow,
  user,
} from "~/server/db/schema";

const entity = z.object({
  entityType: z.enum([
    "page",
    "dynamic_page",
    "company",
    "post",
    "event",
    "reusable_block",
  ]),
  entityId: z.string(),
});
const state = z.enum([
  "draft",
  "in_review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "archived",
]);

export const workflowRouter = createTRPCRouter({
  get: reviewerProcedure.input(entity).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(editorialWorkflow)
      .where(
        and(
          eq(editorialWorkflow.siteId, ctx.siteId),
          eq(editorialWorkflow.entityType, input.entityType),
          eq(editorialWorkflow.entityId, input.entityId),
        ),
      )
      .get(),
  ),

  comments: reviewerProcedure.input(entity).query(({ ctx, input }) =>
    ctx.db
      .select({
        id: editorialComment.id,
        body: editorialComment.body,
        resolvedAt: editorialComment.resolvedAt,
        createdAt: editorialComment.createdAt,
        authorId: editorialComment.authorId,
        authorName: user.name,
      })
      .from(editorialComment)
      .leftJoin(user, eq(editorialComment.authorId, user.id))
      .where(
        and(
          eq(editorialComment.siteId, ctx.siteId),
          eq(editorialComment.entityType, input.entityType),
          eq(editorialComment.entityId, input.entityId),
        ),
      )
      .orderBy(desc(editorialComment.createdAt)),
  ),

  transition: editorProcedure
    .input(
      entity.extend({
        state,
        assignedTo: z.string().nullable().optional(),
        publishAt: z.date().nullable().optional(),
        unpublishAt: z.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(editorialWorkflow)
        .values({
          ...input,
          siteId: ctx.siteId,
          assignedTo: input.assignedTo ?? null,
          updatedBy: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [
            editorialWorkflow.siteId,
            editorialWorkflow.entityType,
            editorialWorkflow.entityId,
          ],
          set: {
            state: input.state,
            assignedTo: input.assignedTo ?? null,
            publishAt: input.publishAt ?? null,
            unpublishAt: input.unpublishAt ?? null,
            updatedBy: ctx.session.user.id,
          },
        });
      await ctx.db.insert(auditLog).values({
        siteId: ctx.siteId,
        userId: ctx.session.user.id,
        userEmail: ctx.session.user.email,
        action: "workflow.transition",
        entity: `${input.entityType}:${input.entityId}`,
        detail: input.state,
      });
    }),

  lock: editorProcedure.input(entity).mutation(({ ctx, input }) =>
    ctx.db
      .insert(editorialWorkflow)
      .values({
        ...input,
        siteId: ctx.siteId,
        lockedBy: ctx.session.user.id,
        lockedAt: new Date(),
        updatedBy: ctx.session.user.id,
      })
      .onConflictDoUpdate({
        target: [
          editorialWorkflow.siteId,
          editorialWorkflow.entityType,
          editorialWorkflow.entityId,
        ],
        set: { lockedBy: ctx.session.user.id, lockedAt: new Date() },
      }),
  ),

  unlock: editorProcedure.input(entity).mutation(({ ctx, input }) =>
    ctx.db
      .update(editorialWorkflow)
      .set({ lockedBy: null, lockedAt: null })
      .where(
        and(
          eq(editorialWorkflow.siteId, ctx.siteId),
          eq(editorialWorkflow.entityType, input.entityType),
          eq(editorialWorkflow.entityId, input.entityId),
        ),
      ),
  ),

  addComment: reviewerProcedure
    .input(entity.extend({ body: z.string().min(1).max(5000) }))
    .mutation(({ ctx, input }) =>
      ctx.db.insert(editorialComment).values({
        ...input,
        siteId: ctx.siteId,
        authorId: ctx.session.user.id,
      }),
    ),

  resolveComment: reviewerProcedure
    .input(z.object({ id: z.number(), resolved: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .update(editorialComment)
        .set({ resolvedAt: input.resolved ? new Date() : null })
        .where(
          and(
            eq(editorialComment.siteId, ctx.siteId),
            eq(editorialComment.id, input.id),
          ),
        ),
    ),
});
