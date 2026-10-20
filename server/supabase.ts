import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ProjectConfig } from "./config.ts";

const clients = new Map<string, SupabaseClient>();

export function getSupabase(project: Pick<ProjectConfig, "supabaseUrl" | "supabaseKey">): SupabaseClient {
  const cacheKey = `${project.supabaseUrl}|${project.supabaseKey}`;
  const cached = clients.get(cacheKey);
  if (cached) return cached;
  const client = createClient(project.supabaseUrl, project.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  clients.set(cacheKey, client);
  return client;
}
