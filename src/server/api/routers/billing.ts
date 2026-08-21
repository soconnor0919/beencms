import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "~/env";
import { effectivePlan, plans } from "~/lib/plans";
import { getStripe, priceForPlan, stripeConfigured } from "~/lib/stripe";
import { createTRPCRouter, adminProcedure } from "~/server/api/trpc";
import { siteSubscription } from "~/server/db/schema";

export const billingRouter = createTRPCRouter({
  status: adminProcedure.query(async ({ ctx }) => {
    const subscription = await ctx.db
      .select()
      .from(siteSubscription)
      .where(eq(siteSubscription.siteId, ctx.siteId))
      .get();
    const plan = effectivePlan(subscription?.plan, subscription?.status);
    return {
      configured: stripeConfigured(),
      plan,
      planDetails: plans[plan],
      subscription: subscription ?? null,
      plans: Object.values(plans),
    };
  }),

  createCheckout: adminProcedure
    .input(z.object({ plan: z.enum(["starter", "professional", "business"]) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(siteSubscription)
        .where(eq(siteSubscription.siteId, ctx.siteId))
        .get();
      if (effectivePlan(existing?.plan, existing?.status) !== "free")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Use the billing portal to change an active subscription.",
        });
      const stripe = getStripe();
      const suffix = randomBytes(6)
        .toString("base64url")
        .replace(/[^a-z]/gi, "")
        .slice(0, 8)
        .padEnd(8, "x")
        .toLowerCase();
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        integration_identifier: `hadlockcms_${suffix}`,
        line_items: [{ price: priceForPlan(input.plan), quantity: 1 }],
        customer: existing?.stripeCustomerId ?? undefined,
        customer_email: existing?.stripeCustomerId
          ? undefined
          : ctx.session.user.email,
        client_reference_id: ctx.siteId,
        allow_promotion_codes: true,
        metadata: { siteId: ctx.siteId, plan: input.plan },
        subscription_data: { metadata: { siteId: ctx.siteId } },
        success_url: `${env.BETTER_AUTH_URL}/admin/billing?checkout=success`,
        cancel_url: `${env.BETTER_AUTH_URL}/admin/billing?checkout=canceled`,
      });
      if (!session.url)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stripe did not return a checkout URL.",
        });
      return { url: session.url };
    }),

  createPortal: adminProcedure.mutation(async ({ ctx }) => {
    const subscription = await ctx.db
      .select({ customerId: siteSubscription.stripeCustomerId })
      .from(siteSubscription)
      .where(eq(siteSubscription.siteId, ctx.siteId))
      .get();
    if (!subscription?.customerId)
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "This site does not have a Stripe customer yet.",
      });
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: `${env.BETTER_AUTH_URL}/admin/billing`,
    });
    return { url: session.url };
  }),
});
