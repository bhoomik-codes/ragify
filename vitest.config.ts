import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "__tests__/__mocks__/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/vitest.setup.ts"],
  },
});

