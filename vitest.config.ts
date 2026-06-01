import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// TEMPORARY — added only to run the Vendor-Indent runtime proof harness in
// scripts/dev-test. Reuses the app's real vite aliases so the harness imports
// the SAME store code the app runs. Safe to delete with the harness.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      include: ["scripts/dev-test/**/*.test.{ts,tsx}"],
    },
  }),
);
