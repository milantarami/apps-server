import { Hono } from "hono";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { createApi } from "./app.ts";
import { loadDotEnv, readPort } from "./config.ts";
import { serveStatic } from "@hono/node-server/serve-static";

loadDotEnv();
const HOST = process.env.DASHBOARD_HOST?.trim() || "127.0.0.1";
const DIST = "./dist";

if (!existsSync(resolve(process.cwd(), DIST, "index.html"))) {
  console.error("No build found. Run `pnpm build` first, or use `pnpm dev`.");
  process.exit(1);
}

const app = new Hono();
app.route("/", createApi());
app.use("/*", serveStatic({ root: DIST }));
app.get("*", serveStatic({ path: `${DIST}/index.html` }));

serve({ fetch: app.fetch, hostname: HOST, port: readPort() }, (info) => {
  console.log(`Push dashboard running at http://${HOST}:${info.port}`);
});
