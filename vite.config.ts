import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: mode === "standalone" ? {
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  } : {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@xyflow") || id.includes("node_modules/.pnpm/@xyflow") || id.includes("node_modules/zustand")) return "graph-vendor";
          if (id.includes("node_modules/react") || id.includes("node_modules/.pnpm/react@") || id.includes("node_modules/.pnpm/react-dom")) return "react-vendor";
        },
      },
    },
  },
  test: { environment: "jsdom", setupFiles: "./src/test/setup.ts" },
}));
