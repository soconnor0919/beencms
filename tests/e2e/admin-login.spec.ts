import { expect, test } from "@playwright/test";

test("admin sign-in is branded and accessible", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByLabel("hadlockCMS")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Admin Sign In" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("type", "email");
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toBeVisible();
});

test("seeded owner can authenticate and reach onboarding", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("admin@hadlock.tech");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/admin\/onboarding(?:\?|$)|\/admin$/);
  await expect(page).not.toHaveURL(/\/admin\/login/);
});
