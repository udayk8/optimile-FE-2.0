import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts") || id.includes("@tanstack")) {
            return "data-vendor";
          }

          if (id.includes("zod") || id.includes("react-hook-form")) {
            return "forms-vendor";
          }

          return "vendor";
        },
      },
    },
  },
});
