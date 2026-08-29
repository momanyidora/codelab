import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000, // 30 seconds for retry tests
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["node_modules/", "dist/", "**/*.d.ts", "**/*.test.ts"],
    },
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
  },
});
