import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "production-smoke.spec.ts",
  use: { baseURL: "http://localhost:3012" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3012",
    url: "http://localhost:3012",
    reuseExistingServer: false,
    env: {
      // Guest-only checks: no remote database or rate-limit service is contacted.
      SKIP_ENV_VALIDATION: "1",
      AUTH_SECRET: "local-smoke-test-secret-not-for-production",
      AUTH_URL: "http://localhost:3012",
      AUTH_TRUST_HOST: "true",
      TURSO_DATABASE_URL: ":memory:",
      TURSO_AUTH_TOKEN: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    },
  },
});
