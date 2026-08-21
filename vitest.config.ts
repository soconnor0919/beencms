import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["tests/e2e/**", "node_modules/**"],
    env: {
      BETTER_AUTH_SECRET: "vitest-only-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
    },
    coverage: { reporter: ["text", "json", "html"] },
  },
  resolve: {
    alias: [
      { find: "~", replacement: path.resolve(import.meta.dirname, "src") },
      { find: "server-only", replacement: path.resolve(import.meta.dirname, "tests/server-only.ts") },
    ],
  },
});
