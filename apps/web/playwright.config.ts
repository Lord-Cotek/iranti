import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Use the preinstalled Chromium when present (cloud dev containers); CI installs its own.
const localChromium = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["Pixel 7"],
        launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: existsSync(localChromium) ? { executablePath: localChromium } : {},
      },
    },
  ],
  webServer: {
    command: "node scripts/serve-static.mjs out 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
