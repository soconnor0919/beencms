import "server-only";

import Stripe from "stripe";
import { env } from "~/env";
import type { PlanId } from "~/lib/plans";

let client: Stripe | undefined;

export function stripeConfigured() {
  return Boolean(
    env.STRIPE_SECRET_KEY &&
    env.STRIPE_WEBHOOK_SECRET &&
    env.STRIPE_PRICE_STARTER &&
    env.STRIPE_PRICE_PROFESSIONAL &&
    env.STRIPE_PRICE_BUSINESS,
  );
}

export function getStripe() {
  if (!env.STRIPE_SECRET_KEY)
    throw new Error("Stripe billing is not configured.");
  client ??= new Stripe(env.STRIPE_SECRET_KEY);
  return client;
}

export function priceForPlan(plan: Exclude<PlanId, "free">) {
  const price = {
    starter: env.STRIPE_PRICE_STARTER,
    professional: env.STRIPE_PRICE_PROFESSIONAL,
    business: env.STRIPE_PRICE_BUSINESS,
  }[plan];
  if (!price) throw new Error(`Stripe price for ${plan} is not configured.`);
  return price;
}

export function planForPrice(priceId: string | null | undefined): PlanId {
  if (priceId && priceId === env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId && priceId === env.STRIPE_PRICE_PROFESSIONAL)
    return "professional";
  if (priceId && priceId === env.STRIPE_PRICE_BUSINESS) return "business";
  return "free";
}
