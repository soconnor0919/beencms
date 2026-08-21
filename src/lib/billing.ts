import "server-only";

import type Stripe from "stripe";
import { and, eq, or } from "drizzle-orm";
import { db } from "~/server/db";
import { cmsSite, siteSubscription } from "~/server/db/schema";
import { planForPrice } from "~/lib/stripe";
import {
  effectivePlan,
  plans,
  type PlanId,
  type SubscriptionStatus,
} from "~/lib/plans";

function subscriptionStatus(status: Stripe.Subscription.Status) {
  const allowed = new Set<SubscriptionStatus>([
    "incomplete",
    "incomplete_expired",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
    "paused",
  ]);
  return allowed.has(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : "none";
}

export function syncStripeSubscription(
  subscription: Stripe.Subscription,
  eventCreated?: number,
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = planForPrice(priceId);
  const siteId = subscription.metadata.siteId;
  const existing = db
    .select({
      siteId: siteSubscription.siteId,
      lastStripeEventAt: siteSubscription.lastStripeEventAt,
    })
    .from(siteSubscription)
    .where(
      or(
        eq(siteSubscription.stripeSubscriptionId, subscription.id),
        eq(siteSubscription.stripeCustomerId, customerId),
      ),
    )
    .get();
  const resolvedSiteId = siteId || existing?.siteId;
  if (!resolvedSiteId) throw new Error("Stripe subscription has no site link.");
  const eventDate = eventCreated ? new Date(eventCreated * 1000) : new Date();
  if (
    existing?.lastStripeEventAt &&
    existing.lastStripeEventAt.getTime() > eventDate.getTime()
  )
    return { siteId: resolvedSiteId, ignored: true as const };
  const site = db
    .select({ hostname: cmsSite.hostname })
    .from(cmsSite)
    .where(eq(cmsSite.id, resolvedSiteId))
    .get();
  if (!site) throw new Error("Stripe subscription references an unknown site.");
  const currentPeriodEnd = subscription.items.data.length
    ? new Date(
        Math.max(
          ...subscription.items.data.map((item) => item.current_period_end),
        ) * 1000,
      )
    : null;
  const status = subscriptionStatus(subscription.status);
  const entitledPlan = effectivePlan(plan, status);
  db.transaction((tx) => {
    tx.insert(siteSubscription)
      .values({
        siteId: resolvedSiteId,
        plan,
        status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        currentPeriodEnd,
        lastStripeEventAt: eventDate,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      })
      .onConflictDoUpdate({
        target: siteSubscription.siteId,
        set: {
          plan,
          status,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          currentPeriodEnd,
          lastStripeEventAt: eventDate,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      })
      .run();
    tx.update(cmsSite)
      .set({
        storageQuotaBytes: plans[entitledPlan].storageBytes,
        ...(entitledPlan === "free" && site.hostname
          ? { domainStatus: "pending" as const, domainVerifiedAt: null }
          : {}),
      })
      .where(eq(cmsSite.id, resolvedSiteId))
      .run();
  });
  return { siteId: resolvedSiteId, plan, status };
}

export function getSitePlan(siteId: string): PlanId {
  const subscription = db
    .select({ plan: siteSubscription.plan, status: siteSubscription.status })
    .from(siteSubscription)
    .where(eq(siteSubscription.siteId, siteId))
    .get();
  return effectivePlan(subscription?.plan, subscription?.status);
}
