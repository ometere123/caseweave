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

test("creation form rejects malformed calldata before any navigation or write", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "caseweave-wallet",
      JSON.stringify({ state: { address: "0x1111111111111111111111111111111111111111" }, version: 0 }),
    );
  });
  await page.goto("/agreements/new", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Create Agreement" })).toBeVisible();

  await page.getByLabel("Agreement title").fill("Browser calldata proof");
  await page.getByLabel("Counterparty wallet address").fill("0x1234");
  await page.getByLabel("Agreement text").fill("The respondent must deliver the committed work.");
  await page.getByLabel("Acceptance criteria").fill("The immutable commit must satisfy the delivery obligation.");
  await page.getByLabel("Primary obligation").fill("Deliver the authenticated source revision.");
  await page.getByLabel("Deadline").fill("2030-01-01T00:00");
  await page.getByLabel("GitHub repository URL").fill("https://github.com/ometere123/caseweave");

  await page.getByRole("button", { name: "Create Agreement" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "valid 20-byte wallet address" })).toBeVisible();
  await expect(page).toHaveURL(/\/agreements\/new$/);
});
