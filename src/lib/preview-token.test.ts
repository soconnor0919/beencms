import { describe, expect, it } from "vitest";
import { createPreviewToken, verifyPreviewToken } from "~/lib/preview-token";

describe("preview tokens", () => {
  it("accepts a valid scoped token", () => {
    const token = createPreviewToken("post:hello", Date.now() + 60_000);
    expect(verifyPreviewToken(token, "post:hello")).toBe(true);
    expect(verifyPreviewToken(token, "post:other")).toBe(false);
  });

  it("rejects expired and tampered tokens", () => {
    expect(
      verifyPreviewToken(
        createPreviewToken("post:hello", Date.now() - 1),
        "post:hello",
      ),
    ).toBe(false);
    const token = createPreviewToken("post:hello");
    expect(verifyPreviewToken(`${token}x`, "post:hello")).toBe(false);
  });

  it("does not allow a preview token to cross sites", () => {
    const token = createPreviewToken("site-a:post:hello");
    expect(verifyPreviewToken(token, "site-a:post:hello")).toBe(true);
    expect(verifyPreviewToken(token, "site-b:post:hello")).toBe(false);
  });
});
