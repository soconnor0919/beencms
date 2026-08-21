export type PlanId = "free" | "starter" | "professional" | "business";

export type SubscriptionStatus =
  | "none"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export const plans = {
  free: {
    id: "free",
    name: "Free",
    description: "Build and evaluate a complete site before upgrading.",
    storageBytes: 1_073_741_824,
    memberLimit: 1,
    customDomain: false,
    removeBranding: false,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "A polished public site for an individual or small team.",
    storageBytes: 5_368_709_120,
    memberLimit: 3,
    customDomain: true,
    removeBranding: true,
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "Advanced publishing for growing organizations and studios.",
    storageBytes: 26_843_545_600,
    memberLimit: 10,
    customDomain: true,
    removeBranding: true,
  },
  business: {
    id: "business",
    name: "Business",
    description: "Higher limits and collaboration for established teams.",
    storageBytes: 107_374_182_400,
    memberLimit: 50,
    customDomain: true,
    removeBranding: true,
  },
} as const satisfies Record<PlanId, object>;

const PAID_STATUSES = new Set<SubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
]);

export function effectivePlan(
  plan: PlanId | null | undefined,
  status: SubscriptionStatus | null | undefined,
): PlanId {
  return plan && plan !== "free" && status && PAID_STATUSES.has(status)
    ? plan
    : "free";
}

export function isPaidPlan(plan: PlanId) {
  return plan !== "free";
}
