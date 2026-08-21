import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  editorProcedure,
} from "~/server/api/trpc";
import {
  contactSubmissions,
  contactThrottle,
  siteSettings,
} from "~/server/db/schema";
import { sendContactConfirmation, sendContactNotification } from "~/lib/email";
import { env } from "~/env";
import { recordAnalyticsEvent } from "~/lib/analytics";

export const contactRouter = createTRPCRouter({
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        email: z.string().email().max(256),
        subject: z.string().max(512).optional(),
        message: z.string().min(1).max(5000),
        website: z.string().max(256).optional(),
        captchaToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.website) return;
      const forwarded =
        ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        ctx.headers.get("x-real-ip") ??
        "unknown";
      if (env.TURNSTILE_SECRET_KEY) {
        const verification = new FormData();
        verification.append("secret", env.TURNSTILE_SECRET_KEY);
        verification.append("response", input.captchaToken ?? "");
        verification.append("remoteip", forwarded);
        const response = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          { method: "POST", body: verification },
        );
        const result = (await response.json()) as { success: boolean };
        if (!result.success)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please complete the anti-spam check.",
          });
      }
      const key = `${ctx.siteId}:${createHash("sha256").update(forwarded).digest("hex")}`;
      const now = new Date();
      const throttle = ctx.db
        .select()
        .from(contactThrottle)
        .where(eq(contactThrottle.key, key))
        .get();
      if (
        throttle &&
        now.getTime() - throttle.windowStart.getTime() < 60 * 60 * 1000 &&
        throttle.count >= 5
      ) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many messages. Please try again later.",
        });
      }
      if (
        !throttle ||
        now.getTime() - throttle.windowStart.getTime() >= 60 * 60 * 1000
      ) {
        await ctx.db
          .insert(contactThrottle)
          .values({ siteId: ctx.siteId, key, count: 1, windowStart: now })
          .onConflictDoUpdate({
            target: contactThrottle.key,
            set: { count: 1, windowStart: now },
          });
      } else {
        await ctx.db
          .update(contactThrottle)
          .set({ count: throttle.count + 1 })
          .where(eq(contactThrottle.key, key));
      }
      const {
        website: _website,
        captchaToken: _captchaToken,
        ...message
      } = input;
      await ctx.db
        .insert(contactSubmissions)
        .values({ ...message, siteId: ctx.siteId });
      await recordAnalyticsEvent({
        siteId: ctx.siteId,
        headers: ctx.headers,
        kind: "conversion",
        name: "contact_form",
        path: "/contact",
      });
      const notification = ctx.db
        .select({ email: siteSettings.contactEmail })
        .from(siteSettings)
        .where(eq(siteSettings.siteId, ctx.siteId))
        .get();
      // Fire-and-forget — never blocks the response or surfaces SMTP errors to the visitor
      void Promise.all([
        sendContactNotification(message, notification?.email),
        sendContactConfirmation(message),
      ]).catch(console.error);
    }),

  getAll: protectedProcedure.query(({ ctx }) => {
    return ctx.db
      .select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.siteId, ctx.siteId))
      .orderBy(desc(contactSubmissions.createdAt));
  }),

  markRead: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      return ctx.db
        .update(contactSubmissions)
        .set({ read: true })
        .where(
          and(
            eq(contactSubmissions.siteId, ctx.siteId),
            eq(contactSubmissions.id, input.id),
          ),
        );
    }),

  delete: editorProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => {
      return ctx.db
        .delete(contactSubmissions)
        .where(
          and(
            eq(contactSubmissions.siteId, ctx.siteId),
            eq(contactSubmissions.id, input.id),
          ),
        );
    }),
});
