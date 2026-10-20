import { Hono, type Context } from "hono";
import { ApiError } from "./errors.ts";
import { getSupabase } from "./supabase.ts";
import { localOnly, passwordGate } from "./guard.ts";
import { getConfig, readPassword, refreshConfig, type ProjectConfig } from "./config.ts";
import { listHistory } from "./logRepository.ts";
import { assertValidTarget, checkReceipts, sendNotification } from "./pushService.ts";
import { countAudience, disableDevice, listDevices } from "./tokenRepository.ts";
import type {
  ApiErrorBody,
  AudienceResponse,
  Breakdown,
  DevicesResponse,
  HistoryResponse,
  SendRequest,
  SendTarget,
  StatusResponse,
} from "../shared/contract.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireProject(c: Context): Promise<ProjectConfig> {
  const state = await getConfig();
  if (!state.ok) throw new ApiError(503, "not_configured", state.problems.join(" "));
  const id = c.req.query("project");
  if (!id) throw new ApiError(400, "invalid", "Choose a project.");
  const project = state.config.projects.find((item) => item.id === id);
  if (!project) throw new ApiError(404, "not_found", `Unknown project "${id}". Reload the dashboard to refresh the app list.`);
  return project;
}

function parseTarget(type: string | undefined, value: string | undefined): SendTarget {
  if (type === "all") return { type: "all" };
  if (type === "platform" && (value === "android" || value === "ios")) return { type: "platform", platform: value };
  if (type === "token" && value) return { type: "token", token: value.trim() };
  throw new ApiError(400, "invalid", "Choose an audience.");
}

function breakdown(values: readonly (string | null)[], limit: number): Breakdown[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value ?? "Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const sorted = [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  if (sorted.length <= limit) return sorted;
  const rest = sorted.slice(limit - 1).reduce((sum, item) => sum + item.count, 0);
  return [...sorted.slice(0, limit - 1), { label: "Other", count: rest }];
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "invalid", "Request body must be JSON.");
  }
}

function toSendRequest(raw: unknown): SendRequest {
  if (typeof raw !== "object" || raw === null) throw new ApiError(400, "invalid", "Missing message.");
  const input = raw as Record<string, unknown>;
  const target = input.target as Record<string, unknown> | undefined;
  const data = input.data;
  if (data !== null && data !== undefined && (typeof data !== "object" || Array.isArray(data))) {
    throw new ApiError(400, "invalid", "Custom data must be a JSON object.");
  }
  const sendTarget = parseTarget(
    typeof target?.type === "string" ? target.type : undefined,
    typeof target?.platform === "string"
      ? target.platform
      : typeof target?.token === "string"
        ? target.token
        : undefined
  );
  return {
    title: typeof input.title === "string" ? input.title : "",
    body: typeof input.body === "string" ? input.body : "",
    route: typeof input.route === "string" && input.route ? input.route : null,
    data: (data as Record<string, unknown> | null | undefined) ?? null,
    channelId: typeof input.channelId === "string" && input.channelId ? input.channelId : null,
    sound: input.sound !== false,
    target: sendTarget,
    confirmAll: input.confirmAll === true,
    expiresAt: typeof input.expiresAt === "string" ? input.expiresAt : "",
  };
}

export function createApi(): Hono {
  const app = new Hono().basePath("/api");

  app.use("*", localOnly());

  app.get("/status", async (c) => {
    const state = await refreshConfig();
    const body: StatusResponse = state.ok
      ? {
          configured: true,
          problems: [],
          projects: state.config.projects.map((project) => ({
            id: project.id,
            name: project.name,
            appId: project.appId,
            hasExpoAccessToken: project.expoAccessToken !== null,
          })),
          passwordRequired: state.config.password !== null,
        }
      : {
          configured: false,
          problems: state.problems,
          projects: [],
          passwordRequired: state.password !== null,
        };
    return c.json(body);
  });

  app.use("*", passwordGate(readPassword));

  app.get("/session", (c) => c.json({ ok: true }));

  app.get("/audience", async (c) => {
    const config = await requireProject(c);
    const target = parseTarget(c.req.query("type"), c.req.query("value"));
    assertValidTarget(target);
    const count = await countAudience(getSupabase(config), config.appId, target);
    return c.json({ count } satisfies AudienceResponse);
  });

  app.post("/send", async (c) => {
    const config = await requireProject(c);
    const request = toSendRequest(await readJson(c));
    return c.json(await sendNotification(getSupabase(config), config, request));
  });

  app.post("/sends/:id/receipts", async (c) => {
    const config = await requireProject(c);
    const id = c.req.param("id");
    if (!UUID_PATTERN.test(id)) throw new ApiError(400, "invalid", "Unknown send id.");
    return c.json(await checkReceipts(getSupabase(config), config, id));
  });

  app.get("/devices", async (c) => {
    const config = await requireProject(c);
    const { devices, truncated } = await listDevices(getSupabase(config), config.appId);
    const enabled = devices.filter((device) => device.enabled);
    const body: DevicesResponse = {
      total: devices.length,
      enabled: enabled.length,
      byPlatform: breakdown(
        enabled.map((device) => (device.platform === "ios" ? "iOS" : "Android")),
        4
      ),
      byVersion: breakdown(
        enabled.map((device) => device.appVersion),
        6
      ),
      byLocale: breakdown(
        enabled.map((device) => device.locale),
        8
      ),
      devices: devices.slice(0, 300),
      truncated,
    };
    return c.json(body);
  });

  app.post("/devices/:id/disable", async (c) => {
    const config = await requireProject(c);
    const id = c.req.param("id");
    if (!UUID_PATTERN.test(id)) throw new ApiError(400, "invalid", "Unknown device id.");
    const found = await disableDevice(getSupabase(config), config.appId, id);
    if (!found) throw new ApiError(404, "not_found", "That device is not registered.");
    return c.json({ ok: true });
  });

  app.get("/history", async (c) => {
    const config = await requireProject(c);
    return c.json({ entries: await listHistory(getSupabase(config), config.appId) } satisfies HistoryResponse);
  });

  app.notFound((c) => c.json({ error: "Not found.", code: "not_found" } satisfies ApiErrorBody, 404));

  app.onError((error, c) => {
    if (error instanceof ApiError) {
      return c.json({ error: error.message, code: error.code } satisfies ApiErrorBody, error.status);
    }
    console.error("[dashboard] unexpected error", error);
    return c.json(
      {
        error: "Something went wrong on the dashboard server. See the terminal.",
        code: "upstream",
      } satisfies ApiErrorBody,
      502
    );
  });

  return app;
}
