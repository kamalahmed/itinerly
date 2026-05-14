import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    // Component tests need a DOM; everything else runs in node.
    environmentMatchGlobs: [["tests/components/**", "jsdom"]],
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.spec.{ts,tsx}"],
    // Several suites touch the shared SQLite dev.db — run files serially to
    // avoid write-lock contention.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["lib/**", "app/**", "components/**"],
      exclude: [
        "**/*.d.ts",
        "components/ui/**",
        "app/**/layout.tsx",
        "app/**/globals.css",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
