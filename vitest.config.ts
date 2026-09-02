import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["opencode/**/*.test.ts"],
    exclude: ["**/node_modules/**", "opencode/plugins/archive/**"],
    environment: "node"
  }
});
