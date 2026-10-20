import type { SupabaseClient } from "@supabase/supabase-js";
import { fromSupabase } from "./errors.ts";

const SQL_FILE = "broadcast_notifications.sql";

export interface NewBroadcast {
  readonly appId: number;
  readonly title: string;
  readonly body: string;
  readonly data: Readonly<Record<string, unknown>>;
  readonly expiresAt: string;
}

export async function insertBroadcast(sb: SupabaseClient, broadcast: NewBroadcast): Promise<string> {
  const { data, error } = await sb
    .from("broadcast_notifications")
    .insert({
      app_id: broadcast.appId,
      title: broadcast.title,
      body: broadcast.body,
      data: broadcast.data,
      expires_at: broadcast.expiresAt,
    })
    .select("id")
    .single();
  if (error) throw fromSupabase("broadcast insert", error, SQL_FILE);
  return (data as { id: string }).id;
}

export async function linkBroadcastLog(sb: SupabaseClient, appId: number, id: string, logId: string): Promise<void> {
  const { error } = await sb
    .from("broadcast_notifications")
    .update({ push_log_id: logId })
    .eq("app_id", appId)
    .eq("id", id);
  if (error) throw fromSupabase("broadcast update", error, SQL_FILE);
}
