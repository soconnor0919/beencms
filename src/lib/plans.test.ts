import { describe, expect, it } from "vitest";
import { effectivePlan, isPaidPlan, plans } from "~/lib/plans";

describe("billing plans", () => {
  it("keeps entitlements during active, trial, and retry states", () => {
    expect(effectivePlan("professional", "active")).toBe("professional");
    expect(effectivePlan("starter", "trialing")).toBe("starter");
    expect(effectivePlan("business", "past_due")).toBe("business");
  });

  it("falls back safely when a paid subscription is no longer usable", () => {
    expect(effectivePlan("business", "canceled")).toBe("free");
    expect(effectivePlan("professional", "unpaid")).toBe("free");
    expect(effectivePlan(undefined, undefined)).toBe("free");
  });

  it("defines increasing quotas", () => {
    expect(plans.business.storageBytes).toBeGreaterThan(
      plans.professional.storageBytes,
    );
    expect(plans.professional.memberLimit).toBeGreaterThan(
      plans.starter.memberLimit,
    );
    expect(isPaidPlan("free")).toBe(false);
  });
});
