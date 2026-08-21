import { createHash, createHmac, randomBytes, randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "~/server/api/trpc";
import {
  cmsSite,
  operationEvent,
  siteMembership,
  siteSettings,
  webhookDelivery,
  webhookEndpoint,
} from "~/server/db/schema";
import { env } from "~/env";
import { getEmailProvider } from "~/lib/email";
import {
  domainVerificationName,
  domainVerificationValue,
  verifyDomainOwnership,
} from "~/lib/domain";
import { TRPCError } from "@trpc/server";
import { getSitePlan } from "~/lib/billing";
import { plans } from "~/lib/plans";

export const platformRouter = createTRPCRouter({
  health: protectedProcedure.query(() => ({
    status: "ok" as const,
    database: "sqlite",
    storage: env.STORAGE_DRIVER,
    smtpConfigured: Boolean(env.EMAIL_SMTP_HOST),
    emailProvider: getEmailProvider(),
    emailConfigured: getEmailProvider() !== "unconfigured",
    spamProtection: Boolean(env.TURNSTILE_SECRET_KEY),
    node: process.version,
    checkedAt: new Date(),
  })),
  sites: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: cmsSite.id,
        name: cmsSite.name,
        slug: cmsSite.slug,
        hostname: cmsSite.hostname,
        domainStatus: cmsSite.domainStatus,
        locale: cmsSite.locale,
        timezone: cmsSite.timezone,
        status: cmsSite.status,
        role: siteMembership.role,
      })
      .from(siteMembership)
      .innerJoin(cmsSite, eq(siteMembership.siteId, cmsSite.id))
      .where(eq(siteMembership.userId, ctx.session.user.id))
      .orderBy(cmsSite.name),
  ),
  currentSite: protectedProcedure.query(({ ctx }) =>
    ctx.db.select().from(cmsSite).where(eq(cmsSite.id, ctx.siteId)).get(),
  ),
  saveSite: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        slug: z.string().regex(/^[a-z0-9-]+$/),
        hostname: z
          .string()
          .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)
          .nullable()
          .optional(),
        locale: z.string().default("en-US"),
        timezone: z.string().default("America/New_York"),
        status: z.enum(["active", "archived"]).default("active"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id && input.id !== ctx.siteId)
        throw new TRPCError({ code: "FORBIDDEN" });
      if (input.hostname) {
        const plan = input.id ? getSitePlan(ctx.siteId) : "free";
        if (!plans[plan].customDomain)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "A Starter plan or higher is required for custom domains.",
          });
      }
      const id = input.id ?? randomUUID();
      const existing = await ctx.db
        .select({
          hostname: cmsSite.hostname,
          domainStatus: cmsSite.domainStatus,
          domainVerificationToken: cmsSite.domainVerificationToken,
          domainVerifiedAt: cmsSite.domainVerifiedAt,
        })
        .from(cmsSite)
        .where(eq(cmsSite.id, id))
        .get();
      const hostname = input.hostname ?? null;
      const hostnameChanged = existing?.hostname !== hostname;
      const domainVerificationToken = hostname
        ? hostnameChanged
          ? randomBytes(24).toString("base64url")
          : (existing?.domainVerificationToken ??
            randomBytes(24).toString("base64url"))
        : null;
      const domainStatus = hostname
        ? hostnameChanged
          ? ("pending" as const)
          : (existing?.domainStatus ?? ("pending" as const))
        : ("unconfigured" as const);
      await ctx.db
        .insert(cmsSite)
        .values({
          ...input,
          id,
          hostname,
          domainStatus,
          domainVerificationToken,
          domainVerifiedAt: hostnameChanged ? null : existing?.domainVerifiedAt,
        })
        .onConflictDoUpdate({
          target: cmsSite.id,
          set: {
            name: input.name,
            slug: input.slug,
            hostname,
            locale: input.locale,
            timezone: input.timezone,
            status: input.status,
            domainStatus,
            domainVerificationToken,
            domainVerifiedAt: hostnameChanged
              ? null
              : existing?.domainVerifiedAt,
          },
        });
      await ctx.db
        .insert(siteMembership)
        .values({ siteId: id, userId: ctx.session.user.id, role: "owner" })
        .onConflictDoNothing();
      await ctx.db
        .insert(siteSettings)
        .values({ siteId: id, siteName: input.name })
        .onConflictDoNothing();
      return { id };
    }),
  verifyDomain: adminProcedure.mutation(async ({ ctx }) => {
    const plan = getSitePlan(ctx.siteId);
    if (!plans[plan].customDomain)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "A Starter plan or higher is required for custom domains.",
      });
    const site = await ctx.db
      .select({
        hostname: cmsSite.hostname,
        token: cmsSite.domainVerificationToken,
      })
      .from(cmsSite)
      .where(eq(cmsSite.id, ctx.siteId))
      .get();
    if (!site?.hostname || !site.token)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Save a custom hostname before verifying it.",
      });
    const verified = await verifyDomainOwnership(site.hostname, site.token);
    await ctx.db
      .update(cmsSite)
      .set({
        domainStatus: verified ? "verified" : "failed",
        domainVerifiedAt: verified ? new Date() : null,
      })
      .where(eq(cmsSite.id, ctx.siteId));
    return {
      verified,
      recordName: domainVerificationName(site.hostname),
      recordValue: domainVerificationValue(site.token),
    };
  }),
  rotateMcpToken: adminProcedure.mutation(async ({ ctx }) => {
    const token = `hcms_${randomBytes(32).toString("base64url")}`;
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await ctx.db
      .update(cmsSite)
      .set({ mcpTokenHash: tokenHash })
      .where(eq(cmsSite.id, ctx.siteId));
    return { token };
  }),
  webhooks: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.siteId, ctx.siteId))
      .orderBy(webhookEndpoint.name),
  ),
  deliveries: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select({
        id: webhookDelivery.id,
        endpointId: webhookDelivery.endpointId,
        event: webhookDelivery.event,
        responseCode: webhookDelivery.responseCode,
        success: webhookDelivery.success,
        error: webhookDelivery.error,
        attemptedAt: webhookDelivery.attemptedAt,
      })
      .from(webhookDelivery)
      .innerJoin(
        webhookEndpoint,
        eq(webhookDelivery.endpointId, webhookEndpoint.id),
      )
      .where(eq(webhookEndpoint.siteId, ctx.siteId))
      .orderBy(desc(webhookDelivery.attemptedAt))
      .limit(100),
  ),
  saveWebhook: adminProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        url: z.string().url(),
        events: z.array(z.string()),
        active: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = input.id ?? randomUUID();
      const existing = input.id
        ? ctx.db
            .select()
            .from(webhookEndpoint)
            .where(
              and(
                eq(webhookEndpoint.id, input.id),
                eq(webhookEndpoint.siteId, ctx.siteId),
              ),
            )
            .get()
        : null;
      await ctx.db
        .insert(webhookEndpoint)
        .values({
          id,
          siteId: ctx.siteId,
          name: input.name,
          url: input.url,
          events: JSON.stringify(input.events),
          active: input.active,
          secret: existing?.secret ?? randomBytes(32).toString("hex"),
        })
        .onConflictDoUpdate({
          target: webhookEndpoint.id,
          set: {
            name: input.name,
            url: input.url,
            events: JSON.stringify(input.events),
            active: input.active,
          },
        });
      return { id };
    }),
  deleteWebhook: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) =>
      ctx.db
        .delete(webhookEndpoint)
        .where(
          and(
            eq(webhookEndpoint.id, input.id),
            eq(webhookEndpoint.siteId, ctx.siteId),
          ),
        ),
    ),
  testWebhook: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const endpoint = ctx.db
        .select()
        .from(webhookEndpoint)
        .where(
          and(
            eq(webhookEndpoint.id, input.id),
            eq(webhookEndpoint.siteId, ctx.siteId),
          ),
        )
        .get();
      if (!endpoint) return { ok: false };
      const payload = JSON.stringify({
        event: "webhook.test",
        createdAt: new Date().toISOString(),
        data: { source: "hadlockCMS" },
      });
      const signature = createHmac("sha256", endpoint.secret)
        .update(payload)
        .digest("hex");
      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-hadlockcms-signature": signature,
          },
          body: payload,
          signal: AbortSignal.timeout(10_000),
        });
        await ctx.db.insert(webhookDelivery).values({
          endpointId: endpoint.id,
          event: "webhook.test",
          responseCode: response.status,
          success: response.ok,
        });
        return { ok: response.ok, status: response.status };
      } catch (error) {
        await ctx.db.insert(webhookDelivery).values({
          endpointId: endpoint.id,
          event: "webhook.test",
          success: false,
          error: error instanceof Error ? error.message : "Request failed",
        });
        return { ok: false };
      }
    }),
  operations: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(operationEvent)
      .where(eq(operationEvent.siteId, ctx.siteId))
      .orderBy(desc(operationEvent.createdAt))
      .limit(200),
  ),
});
