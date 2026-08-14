import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      NEXT_PUBLIC_NAKAMA_HOST: "api.xoranetwork.com",
      NEXT_PUBLIC_NAKAMA_PORT: "443",
      NEXT_PUBLIC_NAKAMA_SSL: "true",
      NAKAMA_SERVER_KEY: "test-server-key",
      NAKAMA_HTTP_KEY: "test-http-key",
      XORA_RECOVERY_SECRET: "test-recovery-secret",
      SITE_URL: "https://account.xoranetwork.com",
    },
  },
});
