import { defineConfig, devices } from "@playwright/test";

const startLocalServer = process.env.PLAYWRIGHT_START_SERVER === "1";

export default defineConfig({
  testDir: "test/frontend",
  testMatch: "playwright.spec.ts",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"], ["json", { outputFile: "test-evidence/playwright.json" }]],
  use: {
    baseURL: startLocalServer
      ? "http://127.0.0.1:3000"
      : (process.env.PLAYWRIGHT_BASE_URL ?? "https://caseweave.vercel.app"),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: startLocalServer
    ? {
        command: "npm run start",
        cwd: "app",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
