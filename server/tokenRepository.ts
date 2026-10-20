import type { SupabaseClient } from "@supabase/supabase-js";
import { fromSupabase } from "./errors.ts";
import type { DevicePlatform, DeviceRow, SendTarget } from "../shared/contract.ts";

const PAGE_SIZE = 1000;
const MAX_DEVICE_ROWS = 20_000;

interface TokenRow {
  readonly id: string;
  readonly token: string;
  readonly platform: DevicePlatform;
  readonly app_version: string | null;
  readonly locale: string | null;
  readonly timezone: string | null;
  readonly enabled: boolean;
  readonly disabled_reason: string | null;
  readonly last_seen_at: string;
  readonly created_at: string;
}

export interface AudienceToken {
  readonly token: string;
}

function toDevice(row: TokenRow): DeviceRow {
  return {
    id: row.id,
    token: row.token,
    platform: row.platform,
    appVersion: row.app_version,
    locale: row.locale,
    timezone: row.timezone,
    enabled: row.enabled,
    disabledReason: row.disabled_reason,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export async function countAudience(sb: SupabaseClient, appId: number, target: SendTarget): Promise<number> {
  if (target.type === "token") {
    const { count, error } = await sb
      .from("push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("app_id", appId)
      .eq("token", target.token);
    if (error) throw fromSupabase("count", error);
    return count ?? 0;
  }
  let query = sb
    .from("push_tokens")
    .select("id", { count: "exact", head: true })
    .eq("app_id", appId)
    .eq("enabled", true);
  if (target.type === "platform") query = query.eq("platform", target.platform);
  const { count, error } = await query;
  if (error) throw fromSupabase("count", error);
  return count ?? 0;
}

export async function listAudienceTokens(sb: SupabaseClient, appId: number, target: SendTarget): Promise<string[]> {
  if (target.type === "token") return [target.token];
  const tokens: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = sb.from("push_tokens").select("token").eq("app_id", appId).eq("enabled", true);
    if (target.type === "platform") query = query.eq("platform", target.platform);
    const { data, error } = await query.order("id").range(from, from + PAGE_SIZE - 1);
    if (error) throw fromSupabase("token listing", error);
    for (const row of data ?? []) tokens.push((row as AudienceToken).token);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return tokens;
}

export async function disableTokens(sb: SupabaseClient, tokens: readonly string[], reason: string): Promise<number> {
  if (tokens.length === 0) return 0;
  let disabled = 0;
  for (let i = 0; i < tokens.length; i += 200) {
    const batch = tokens.slice(i, i + 200);
    const { data, error } = await sb
      .from("push_tokens")
      .update({ enabled: false, disabled_reason: reason, updated_at: new Date().toISOString() })
      .in("token", batch)
      .eq("enabled", true)
      .select("id");
    if (error) throw fromSupabase("disable", error);
    disabled += data?.length ?? 0;
  }
  return disabled;
}

export async function disableDevice(sb: SupabaseClient, appId: number, id: string): Promise<boolean> {
  const { data, error } = await sb
    .from("push_tokens")
    .update({ enabled: false, disabled_reason: "dashboard", updated_at: new Date().toISOString() })
    .eq("app_id", appId)
    .eq("id", id)
    .select("id");
  if (error) throw fromSupabase("disable", error);
  return (data?.length ?? 0) > 0;
}

export async function listDevices(
  sb: SupabaseClient,
  appId: number
): Promise<{ readonly devices: DeviceRow[]; readonly truncated: boolean }> {
  const devices: DeviceRow[] = [];
  for (let from = 0; from < MAX_DEVICE_ROWS; from += PAGE_SIZE) {
    const { data, error } = await sb
      .from("push_tokens")
      .select("id, token, platform, app_version, locale, timezone, enabled, disabled_reason, last_seen_at, created_at")
      .eq("app_id", appId)
      .order("last_seen_at", { ascending: false })
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw fromSupabase("device listing", error);
    for (const row of (data ?? []) as TokenRow[]) devices.push(toDevice(row));
    if (!data || data.length < PAGE_SIZE) return { devices, truncated: false };
  }
  return { devices, truncated: true };
}
