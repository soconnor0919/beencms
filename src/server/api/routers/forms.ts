import { createHash, randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  editorProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import {
  contactThrottle,
  customForm,
  customFormSubmission,
} from "~/server/db/schema";
import { emitWebhook } from "~/lib/webhooks";
import { sendAccountEmail } from "~/lib/email";
import { env } from "~/env";
import { recordAnalyticsEvent } from "~/lib/analytics";

const field = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "email", "textarea", "select", "checkbox", "consent"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export const formsRouter = createTRPCRouter({
  getPublic: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ ctx, input }) => {
      const form = ctx.db
        .select()
        .from(customForm)
        .where(
          and(
            eq(customForm.siteId, ctx.siteId),
            eq(customForm.slug, input.slug),
          ),
        )
        .get();
      return form?.active ? form : undefined;
    }),
  getAll: editorProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(customForm)
      .where(eq(customForm.siteId, ctx.siteId))
      .orderBy(customForm.name),
  ),
  getById: editorProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(customForm)
        .where(
          and(eq(customForm.siteId, ctx.siteId), eq(customForm.id, input.id)),
        )
        .get(),
    ),
  getSubmissions: editorProcedure
    .input(z.object({ formId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select({
          id: customFormSubmission.id,
          formId: customFormSubmission.formId,
          data: customFormSubmission.data,
          status: customFormSubmission.status,
          assignedTo: customFormSubmission.assignedTo,
          createdAt: customFormSubmission.createdAt,
        })
        .from(customFormSubmission)
        .innerJoin(customForm, eq(customFormSubmission.formId, customForm.id))
        .where(
          and(
            eq(customForm.siteId, ctx.siteId),
            eq(customFormSubmission.formId, input.formId),
          ),
        )
        .orderBy(desc(customFormSubmission.createdAt)),
    ),
  save: editorProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        fields: z.array(field),
        submitLabel: z.string().min(1),
        successMessage: z.string().min(1),
        notificationEmail: z.string().email().nullable().optional(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.id ?? randomUUID();
      if (input.id) {
        const existing = ctx.db
          .select({ id: customForm.id })
          .from(customForm)
          .where(
            and(eq(customForm.siteId, ctx.siteId), eq(customForm.id, input.id)),
          )
          .get();
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      }
      const values = {
        ...input,
        id,
        siteId: ctx.siteId,
        fields: JSON.stringify(input.fields),
        notificationEmail: input.notificationEmail ?? null,
      };
      await ctx.db
        .insert(customForm)
        .values(values)
        .onConflictDoUpdate({ target: customForm.id, set: values });
      return { id };
    }),
  submit: publicProcedure
    .input(
      z.object({
        formId: z.string(),
        data: z.record(
          z.string(),
          z.union([
            z.string().max(10000),
            z.boolean(),
            z.array(z.string().max(1000)).max(100),
          ]),
        ),
        website: z.string().max(256).optional(),
        captchaToken: z.string().optional(),
        path: z.string().max(2048).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.website) return { ok: true };
      const form = ctx.db
        .select()
        .from(customForm)
        .where(
          and(
            eq(customForm.siteId, ctx.siteId),
            eq(customForm.id, input.formId),
          ),
        )
        .get();
      if (!form?.active) throw new TRPCError({ code: "NOT_FOUND" });
      const fields = field.array().parse(JSON.parse(form.fields));
      const allowed = new Set(fields.map((item) => item.id));
      if (Object.keys(input.data).some((key) => !allowed.has(key)))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "The submission contains an unknown field.",
        });
      for (const item of fields) {
        const value = input.data[item.id];
        if (item.required && !value)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${item.label} is required.`,
          });
        if (
          item.type === "email" &&
          value &&
          !z.string().email().safeParse(value).success
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${item.label} must be a valid email address.`,
          });
        if (
          item.type === "select" &&
          value &&
          !item.options?.includes(String(value))
        )
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${item.label} has an invalid selection.`,
          });
      }
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
        if (!((await response.json()) as { success: boolean }).success)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please complete the anti-spam check.",
          });
      }
      const throttleKey = `${ctx.siteId}:form:${createHash("sha256").update(forwarded).digest("hex")}`;
      const now = new Date();
      const throttle = ctx.db
        .select()
        .from(contactThrottle)
        .where(eq(contactThrottle.key, throttleKey))
        .get();
      const freshWindow =
        !throttle ||
        now.getTime() - throttle.windowStart.getTime() >= 3_600_000;
      if (!freshWindow && throttle.count >= 10)
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many submissions. Please try again later.",
        });
      await ctx.db
        .insert(contactThrottle)
        .values({
          siteId: ctx.siteId,
          key: throttleKey,
          count: 1,
          windowStart: now,
        })
        .onConflictDoUpdate({
          target: contactThrottle.key,
          set: freshWindow
            ? { count: 1, windowStart: now }
            : { count: (throttle?.count ?? 0) + 1 },
        });
      await ctx.db
        .insert(customFormSubmission)
        .values({ formId: form.id, data: JSON.stringify(input.data) });
      await recordAnalyticsEvent({
        siteId: ctx.siteId,
        headers: ctx.headers,
        kind: "conversion",
        name: `form:${form.slug}`,
        path: input.path ?? "/",
      });
      void emitWebhook(ctx.siteId, "form.submitted", {
        formId: form.id,
        formSlug: form.slug,
        data: input.data,
      });
      if (form.notificationEmail) {
        const summary = fields
          .map((item) => `${item.label}: ${String(input.data[item.id] ?? "")}`)
          .join("\n");
        void sendAccountEmail({
          to: form.notificationEmail,
          subject: `New ${form.name} submission`,
          text: `A new submission was received in hadlockCMS.\n\n${summary}`,
        }).catch(console.error);
      }
      return { ok: true, message: form.successMessage };
    }),
  updateSubmission: editorProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "in_progress", "resolved", "spam"]),
        assignedTo: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owned = ctx.db
        .select({ id: customFormSubmission.id })
        .from(customFormSubmission)
        .innerJoin(customForm, eq(customFormSubmission.formId, customForm.id))
        .where(
          and(
            eq(customForm.siteId, ctx.siteId),
            eq(customFormSubmission.id, input.id),
          ),
        )
        .get();
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db
        .update(customFormSubmission)
        .set({ status: input.status, assignedTo: input.assignedTo ?? null })
        .where(eq(customFormSubmission.id, input.id));
    }),
  delete: editorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(customForm)
        .where(
          and(eq(customForm.siteId, ctx.siteId), eq(customForm.id, input.id)),
        ),
    ),
});
