import { expect, test } from "@playwright/test";

test("public site has keyboard skip navigation and security headers", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response?.headers()["content-security-policy"]).toContain(
    "object-src 'none'",
  );
  const skip = page.getByRole("link", { name: "Skip to Content" });
  await skip.focus();
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("analytics honors browser do-not-track", async ({ request }) => {
  const response = await request.post("/api/analytics", {
    headers: { dnt: "1" },
    data: { kind: "pageview", path: "/privacy-test" },
  });
  expect(response.status()).toBe(204);
});
