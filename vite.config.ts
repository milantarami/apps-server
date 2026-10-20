import react from "@vitejs/plugin-react";
import { readPort } from "./server/config.ts";
import { getRequestListener } from "@hono/node-server";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";

const HOST = "127.0.0.1";

function dashboardApi(): Plugin {
  return {
    name: "dashboard-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const { createApi } = (await server.ssrLoadModule("/server/app.ts")) as typeof import("./server/app.ts");
          await getRequestListener(createApi().fetch)(req, res);
        } catch (error) {
          next(error);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), dashboardApi()],
  envPrefix: "VITE_",
  server: { host: HOST, port: readPort(), strictPort: true },
  preview: { host: HOST, port: readPort(), strictPort: true },
  build: { outDir: "dist", emptyOutDir: true },
});
