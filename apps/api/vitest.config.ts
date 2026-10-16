import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    setupFiles: ["test/support/env.ts"],
    globalSetup: ["test/support/global-setup.ts"],
    // Integration files share one database; run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
