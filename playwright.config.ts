import { defineConfig, devices } from "@playwright/test";

const testDatabase = `/tmp/hadlockcms-e2e-${process.pid}.db`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: { baseURL: "http://localhost:3107", trace: "on-first-retry" },
  webServer: {
    command: `DATABASE_URL=${testDatabase} BETTER_AUTH_URL=http://localhost:3107 bun run db:migrate && DATABASE_URL=${testDatabase} BETTER_AUTH_URL=http://localhost:3107 npx -y node@24 node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.json scripts/seed.ts && DATABASE_URL=${testDatabase} BETTER_AUTH_URL=http://localhost:3107 npx -y node@24 node_modules/next/dist/bin/next dev --port 3107`,
    url: "http://localhost:3107/admin/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
