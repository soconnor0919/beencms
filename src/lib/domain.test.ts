import { describe, expect, it, vi } from "vitest";
import {
  domainVerificationName,
  domainVerificationValue,
  verifyDomainOwnership,
} from "~/lib/domain";

describe("custom-domain ownership", () => {
  it("builds provider-neutral TXT instructions", () => {
    expect(domainVerificationName("www.example.com")).toBe(
      "_hadlockcms.www.example.com",
    );
    expect(domainVerificationValue("secret")).toBe(
      "hadlockcms-verification=secret",
    );
  });

  it("accepts split TXT record segments but rejects different values", async () => {
    const match = vi.fn(async () => [["hadlockcms-verification=", "secret"]]);
    const mismatch = vi.fn(async () => [["different"]]);
    expect(
      await verifyDomainOwnership("example.com", "secret", match as never),
    ).toBe(true);
    expect(
      await verifyDomainOwnership("example.com", "secret", mismatch as never),
    ).toBe(false);
  });
});
