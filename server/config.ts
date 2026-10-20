import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

export interface ProjectConfig {
  readonly id: string;
  readonly name: string;
  readonly supabaseUrl: string;
  readonly supabaseKey: string;
  readonly expoAccessToken: string | null;
  readonly appId: number;
}

export interface DashboardConfig {
  readonly password: string | null;
  readonly projects: readonly ProjectConfig[];
}

export type ConfigState =
  | { readonly ok: true; readonly config: DashboardConfig }
  | { readonly ok: false; readonly problems: readonly string[]; readonly password: string | null };

export const DEFAULT_PORT = 5178;
const CACHE_TTL_MS = 60_000;
const NAME_COLUMNS = ["name", "title", "slug"] as const;

let envLoaded = false;

export function loadDotEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const name = process.env.ENV_FILE?.trim();
  const file = resolve(process.cwd(), name || ".env");
  if (existsSync(file)) process.loadEnvFile(file);
  else if (name) throw new Error(`ENV_FILE points at ${name}, which does not exist.`);
}

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function jwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload) return null;
  try {
    const decoded: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const role = (decoded as { role?: unknown }).role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

function keyProblem(name: string, key: string): string | null {
  if (key.startsWith("sb_publishable_")) {
    return `${name} holds the publishable key. Use the secret key (sb_secret_…) or the legacy service_role key.`;
  }
  if (key.startsWith("eyJ") && jwtRole(key) === "anon") {
    return `${name} holds the legacy anon key. Use the secret key (sb_secret_…) or the legacy service_role key.`;
  }
  return null;
}

export function readPort(): number {
  loadDotEnv();
  const port = Number(readEnv("DASHBOARD_PORT") ?? DEFAULT_PORT);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_PORT;
}

export function readPassword(): string | null {
  loadDotEnv();
  return readEnv("DASHBOARD_PASSWORD");
}

function notConfigured(problems: readonly string[]): ConfigState {
  return { ok: false, problems, password: readPassword() };
}

function appName(row: Record<string, unknown>, appId: number): string {
  for (const column of NAME_COLUMNS) {
    const value = row[column];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return `App ${appId}`;
}

// A per-app token (EXPO_ACCESS_TOKEN_<appId>) wins over the shared EXPO_ACCESS_TOKEN. Never read from the database.
function expoTokenFor(appId: number): string | null {
  return readEnv(`EXPO_ACCESS_TOKEN_${appId}`) ?? readEnv("EXPO_ACCESS_TOKEN");
}

async function fetchConfig(): Promise<ConfigState> {
  const url = readEnv("SUPABASE_URL");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  const problems: string[] = [];
  if (!url) problems.push("SUPABASE_URL is not set.");
  else if (!/^https?:\/\/\S+$/.test(url)) problems.push("SUPABASE_URL must be a full URL like https://xyz.supabase.co.");
  if (!key) problems.push("SUPABASE_SERVICE_ROLE_KEY is not set.");
  else {
    const problem = keyProblem("SUPABASE_SERVICE_ROLE_KEY", key);
    if (problem) problems.push(problem);
  }
  if (problems.length > 0 || !url || !key) return notConfigured(problems);

  const supabaseUrl = url.replace(/\/+$/, "");
  const client = createClient(supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.from("apps").select("*").order("id", { ascending: true });
  if (error) {
    console.error("[dashboard] could not load apps:", error.message);
    return notConfigured([
      "Couldn't load the apps table from Supabase. Check SUPABASE_URL and the key, and that the project isn't paused.",
    ]);
  }

  const projects: ProjectConfig[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const appId = Number(row.id);
    if (!Number.isInteger(appId) || appId <= 0) continue;
    projects.push({
      id: String(appId),
      name: appName(row, appId),
      supabaseUrl,
      supabaseKey: key,
      expoAccessToken: expoTokenFor(appId),
      appId,
    });
  }
  if (projects.length === 0) return notConfigured(["The apps table in Supabase has no rows."]);
  return { ok: true, config: { password: readPassword(), projects } };
}

let cache: { readonly state: ConfigState & { readonly ok: true }; readonly at: number } | null = null;
let inflight: Promise<ConfigState> | null = null;

// Loads the app list from Supabase. A failed refresh keeps serving the last good list.
export function refreshConfig(force = false): Promise<ConfigState> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return Promise.resolve(cache.state);
  inflight ??= fetchConfig()
    .then((state) => {
      if (state.ok) cache = { state, at: Date.now() };
      return state.ok || !cache ? state : cache.state;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

// Cheap path for data routes: whatever was loaded last, loading once if nothing was.
export function getConfig(): Promise<ConfigState> {
  return cache ? Promise.resolve(cache.state) : refreshConfig();
}
