import { defineConfig } from "vite";

export default defineConfig({
  ssr: { noExternal: true, target: "node" },
  build: {
    ssr: "server/index.ts",
    outDir: "dist-server",
    emptyOutDir: true,
    target: "node24",
    minify: true,
    rollupOptions: { output: { entryFileNames: "server.mjs" } },
  },
});
