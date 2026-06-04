import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

// Runs the shared-package unit tests plus the (TEMPORARY) Vendor-Indent
// runtime proof harness in scripts/dev-test. Reuses the app's real vite
// aliases so the harness imports the SAME store code the app runs.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      include: ["scripts/dev-test/**/*.test.{ts,tsx}", "packages/**/src/**/*.test.{ts,tsx}"],
    },
  }),
);
