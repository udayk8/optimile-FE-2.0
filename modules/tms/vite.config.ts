import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(rootDir, "..", "..");

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@tms-booking": path.resolve(rootDir, "src"),
      "@constants": path.resolve(rootDir, "src/constants"),
      "@shared-api": path.resolve(repoRoot, "packages/shared-api/src"),
      "@shared-auth": path.resolve(repoRoot, "packages/shared-auth/src"),
      "@shared-ui": path.resolve(repoRoot, "packages/shared-ui/src"),
      "@shared-utils": path.resolve(repoRoot, "packages/shared-utils/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3008,
    open: false,
  },
});
