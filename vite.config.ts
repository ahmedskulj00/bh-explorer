import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // the boundary data is one big JSON import; keep it out of the app chunk
    // so changes to the UI do not invalidate a 176 kB cached asset
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("municipalities.json")) return "boundaries";
          return undefined;
        },
      },
    },
  },
});
