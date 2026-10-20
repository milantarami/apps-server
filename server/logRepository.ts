import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, fromSupabase } from "./errors.ts";
import type { HistoryEntry, ReasonCount } from "../shared/contract.ts";

const HISTORY_LIMIT = 50;

export interface TicketRef {
  readonly id: string;
  readonly token: string;
}

export interface TicketError {
  readonly token: string;
  readonly reason: string;
  readonly message: string;
}

export interface NewLogEntry {
  readonly appId: number;
  readonly title: string;
  readonly body: string;
  readonly data: Readonly<Record<string, unknown>> | null;
  readonly channelId: string | null;
  readonly sound: boolean;
  readonly targetType: "all" | "platform" | "token";
  readonly targetValue: string | null;
  readonly targetDescription: string;
  readonly sent: number;
  readonly ok: number;
  readonly errors: number;
  readonly ticketErrors: readonly TicketError[];
  readonly tickets: readonly TicketRef[];
}

export interface ReceiptUpdate {
  readonly ok: number;
  readonly errors: number;
  readonly reasons: readonly ReasonCount[];
}

interface LogRow {
  readonly id: string;
  readonly created_at: string;
  readonly title: string;
  readonly body: string;
  readonly data: Record<string, unknown> | null;
  readonly channel_id: string | null;
  readonly sound: boolean;
  readonly target_description: string;
  readonly sent_count: number;
  readonly ok_count: number;
  readonly error_count: number;
  readonly ticket_errors: TicketError[] | null;
  readonly receipts_checked_at: string | null;
  readonly receipt_ok_count: number | null;
  readonly receipt_error_count: number | null;
  readonly receipt_errors: ReasonCount[] | null;
}

export function countReasons(errors: readonly TicketError[]): ReasonCount[] {
  const counts = new Map<string, number>();
  for (const error of errors) counts.set(error.reason, (counts.get(error.reason) ?? 0) + 1);
  return [...counts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
}

function toHistoryEntry(row: LogRow): HistoryEntry {
  const url = row.data?.url;
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    body: row.body,
    route: typeof url === "string" ? url : null,
    channelId: row.channel_id,
    sound: row.sound,
    targetDescription: row.target_description,
    sent: row.sent_count,
    ok: row.ok_count,
    errors: row.error_count,
    reasons: countReasons(row.ticket_errors ?? []),
    receiptsCheckedAt: row.receipts_checked_at,
    receiptOk: row.receipt_ok_count,
    receiptErrors: row.receipt_error_count,
    receiptReasons: row.receipt_errors ?? [],
  };
}

export async function insertLog(sb: SupabaseClient, entry: NewLogEntry): Promise<string> {
  const { data, error } = await sb
    .from("push_notifications_log")
    .insert({
      app_id: entry.appId,
      title: entry.title,
      body: entry.body,
      data: entry.data,
      channel_id: entry.channelId,
      sound: entry.sound,
      target_type: entry.targetType,
      target_value: entry.targetValue,
      target_description: entry.targetDescription,
      sent_count: entry.sent,
      ok_count: entry.ok,
      error_count: entry.errors,
      ticket_errors: entry.ticketErrors,
      tickets: entry.tickets,
    })
    .select("id")
    .single();
  if (error) throw fromSupabase("log insert", error);
  return (data as { id: string }).id;
}

export async function readTickets(sb: SupabaseClient, appId: number, id: string): Promise<TicketRef[]> {
  const { data, error } = await sb
    .from("push_notifications_log")
    .select("tickets")
    .eq("app_id", appId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw fromSupabase("log read", error);
  if (!data) throw new ApiError(404, "not_found", "That send is not in the log.");
  const tickets = (data as { tickets: TicketRef[] | null }).tickets;
  return Array.isArray(tickets) ? tickets : [];
}

export async function saveReceipts(
  sb: SupabaseClient,
  appId: number,
  id: string,
  update: ReceiptUpdate
): Promise<void> {
  const { error } = await sb
    .from("push_notifications_log")
    .update({
      receipts_checked_at: new Date().toISOString(),
      receipt_ok_count: update.ok,
      receipt_error_count: update.errors,
      receipt_errors: update.reasons,
    })
    .eq("app_id", appId)
    .eq("id", id);
  if (error) throw fromSupabase("log update", error);
}

export async function listHistory(sb: SupabaseClient, appId: number): Promise<HistoryEntry[]> {
  const { data, error } = await sb
    .from("push_notifications_log")
    .select(
      "id, created_at, title, body, data, channel_id, sound, target_description, sent_count, ok_count, error_count, ticket_errors, receipts_checked_at, receipt_ok_count, receipt_error_count, receipt_errors"
    )
    .eq("app_id", appId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw fromSupabase("history", error);
  return ((data ?? []) as LogRow[]).map(toHistoryEntry);
}
