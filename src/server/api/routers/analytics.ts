import { and, asc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { buildAnalyticsReport } from "~/lib/analytics-report";
import {
  createTRPCRouter,
  adminProcedure,
  reviewerProcedure,
} from "~/server/api/trpc";
import { analyticsEvent, analyticsSettings } from "~/server/db/schema";

export const analyticsRouter = createTRPCRouter({
  report: reviewerProcedure
    .input(
      z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 86_400_000);
      const [events, settings] = await Promise.all([
        ctx.db
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
              eq(analyticsEvent.siteId, ctx.siteId),
              gte(analyticsEvent.createdAt, since),
            ),
          )
          .orderBy(asc(analyticsEvent.createdAt)),
        ctx.db
          .select()
          .from(analyticsSettings)
          .where(eq(analyticsSettings.siteId, ctx.siteId))
          .get(),
      ]);
      return {
        ...buildAnalyticsReport(events, input.days),
        canManage: ctx.role === "owner" || ctx.role === "admin",
        settings: settings ?? {
          siteId: ctx.siteId,
          enabled: true,
          retentionDays: 90,
          lastPrunedAt: null,
          updatedAt: null,
        },
      };
    }),

  updateSettings: adminProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        retentionDays: z.union([z.literal(30), z.literal(90), z.literal(365)]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db
        .insert(analyticsSettings)
        .values({ siteId: ctx.siteId, ...input })
        .onConflictDoUpdate({
          target: analyticsSettings.siteId,
          set: input,
        }),
    ),
});
