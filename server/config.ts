import { existsSync } from "node:fs";
import { resolve } from "node:path";

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
const DEFAULT_APP_ID = 2;
const DEFAULT_PROJECT_ID = "default";
const DEFAULT_PROJECT_NAME = "Years of Us";
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

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

function envPrefix(id: string): string {
  return `${id.toUpperCase().replace(/-/g, "_")}_`;
}

function readProject(id: string, prefix: string, problems: string[]): ProjectConfig | null {
  const read = (key: string) => {
    const scoped = prefix ? readEnv(`${prefix}${key}`) : null;
    return scoped === null ? { name: key, value: readEnv(key) } : { name: `${prefix}${key}`, value: scoped };
  };
  const label = prefix ? `[${id}] ` : "";
  const url = read("SUPABASE_URL");
  const key = read("SUPABASE_SERVICE_ROLE_KEY");
  const appIdRaw = read("APP_ID");
  const appId = appIdRaw.value === null ? DEFAULT_APP_ID : Number(appIdRaw.value);
  const before = problems.length;

  const missing = (key: string) =>
    `${label}${prefix ? `Neither ${prefix}${key} nor ${key} is set.` : `${key} is not set.`}`;

  if (!url.value) problems.push(missing("SUPABASE_URL"));
  else if (!/^https?:\/\/\S+$/.test(url.value))
    problems.push(`${label}${url.name} must be a full URL like https://xyz.supabase.co.`);
  if (!key.value) problems.push(missing("SUPABASE_SERVICE_ROLE_KEY"));
  else {
    const problem = keyProblem(key.name, key.value);
    if (problem) problems.push(`${label}${problem}`);
  }
  if (!Number.isInteger(appId) || appId <= 0) problems.push(`${label}${appIdRaw.name} must be a positive whole number.`);

  if (problems.length > before || !url.value || !key.value) return null;
  return {
    id,
    name: (prefix ? readEnv(`${prefix}NAME`) : readEnv("PROJECT_NAME")) ?? (prefix ? id : DEFAULT_PROJECT_NAME),
    supabaseUrl: url.value.replace(/\/+$/, ""),
    supabaseKey: key.value,
    expoAccessToken: read("EXPO_ACCESS_TOKEN").value,
    appId,
  };
}

function readProjectIds(problems: string[]): readonly string[] | null {
  const raw = readEnv("PROJECTS");
  if (raw === null) return null;
  const ids = raw
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
  for (const id of ids) {
    if (!PROJECT_ID_PATTERN.test(id))
      problems.push(`PROJECTS: "${id}" is not a valid id. Use lowercase letters, digits and dashes.`);
  }
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicates.length > 0) problems.push(`PROJECTS lists ${[...new Set(duplicates)].join(", ")} more than once.`);
  if (ids.length === 0) problems.push("PROJECTS is set but empty.");
  return ids;
}

export function readConfig(): ConfigState {
  loadDotEnv();
  const password = readEnv("DASHBOARD_PASSWORD");
  const problems: string[] = [];
  const ids = readProjectIds(problems);
  if (problems.length > 0) return { ok: false, problems, password };

  const projects = (ids ?? [DEFAULT_PROJECT_ID])
    .map((id) => readProject(id, ids ? envPrefix(id) : "", problems))
    .filter((project): project is ProjectConfig => project !== null);

  const seen = new Map<string, string>();
  for (const project of projects) {
    const target = `${project.supabaseUrl}|${project.appId}`;
    const other = seen.get(target);
    if (other) problems.push(`[${other}] and [${project.id}] point at the same Supabase project and APP_ID.`);
    else seen.set(target, project.id);
  }

  if (problems.length > 0) return { ok: false, problems, password };
  return { ok: true, config: { password, projects } };
}
