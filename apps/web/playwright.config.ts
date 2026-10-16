import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * e2e runs the real stack: the static export (built with NEXT_PUBLIC_API_URL pointing at
 * the local API), the API (`next start`) against a throwaway Postgres database, and an
 * in-memory S3 stand-in for encrypted file chunks. See e2e/README.md.
 */
const localChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOptions = existsSync(localChromium) ? { executablePath: localChromium } : {};
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/iranti_e2e";

export const WEB = "http://localhost:4173";
export const API = "http://localhost:3001";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: WEB, trace: "on-first-retry" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
  ],
  webServer: [
    {
      command: "node e2e/fake-s3.mjs 9000",
      url: "http://localhost:9000/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @iranti/api exec next start --port 3001",
      url: `${API}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        AUTH_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456",
        AUTH_URL: API,
        WEB_ORIGIN: WEB,
        IRANTI_DEV_MAIL: "1",
        IRANTI_E2E_RELAX_RATE_LIMIT: "1",
        R2_ENDPOINT: "http://localhost:9000",
        R2_ACCESS_KEY_ID: "e2e",
        R2_SECRET_ACCESS_KEY: "e2e",
        R2_BUCKET: "iranti-e2e",
      },
    },
    {
      command: "node scripts/serve-static.mjs out 4173",
      url: WEB,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
