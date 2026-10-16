import { defineConfig } from "vitest/config";

// Unit tests only; e2e/ belongs to Playwright.
export default defineConfig({
  test: { include: ["{app,lib,components}/**/*.test.{ts,tsx}"], passWithNoTests: true },
});
