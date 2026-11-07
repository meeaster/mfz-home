import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["opencode/**/*.test.ts", "mcp/**/*.test.ts", "relays/**/*.test.ts", "executor/tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "opencode/plugins/archive/**"],
    environment: "node"
  }
});
