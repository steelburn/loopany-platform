import { defineConfig } from "vitest/config";

// Backend tests run in plain Node (no TanStack/Vite SSR plugin), so native
// modules like better-sqlite3 load normally.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
