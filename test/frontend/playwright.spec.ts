import { expect, test } from "@playwright/test";

test("agreement creation surface exposes the real structured courtroom workflow", async ({ page }) => {
  const response = await page.goto("/agreements/new", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Create Agreement" })).toBeVisible();
  await expect(page.getByText("Proof-of-performance commitment")).toBeVisible();
  await expect(page.getByLabel("Counterparty wallet address")).toBeVisible();
  await expect(page.getByLabel("Immutable commit SHA")).toHaveCount(0);
  await expect(page.getByText(/green CI result is supporting context, not proof/i)).toBeVisible();
});
