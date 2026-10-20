import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "./errors.ts";
import type { ProjectConfig } from "./config.ts";
import { disableTokens, listAudienceTokens } from "./tokenRepository.ts";
import { insertBroadcast, linkBroadcastLog } from "./broadcastRepository.ts";
import { fetchPushReceipts, sendPushMessages, type ExpoPushMessage } from "./expoPush.ts";
import {
  buildDeliveryData,
  buildPushData,
  isValidToken,
  previewToken,
  validateMessage,
} from "../shared/compose.ts";
import {
  countReasons,
  insertLog,
  readTickets,
  saveReceipts,
  type TicketError,
  type TicketRef,
} from "./logRepository.ts";
import type { ReasonCount, ReceiptsResponse, SendRequest, SendResponse, SendTarget } from "../shared/contract.ts";

const NOT_REGISTERED = "DeviceNotRegistered";

export function describeTarget(target: SendTarget): string {
  if (target.type === "all") return "Everyone · in-app inbox and all enabled devices";
  if (target.type === "platform") return target.platform === "ios" ? "All iOS devices" : "All Android devices";
  return `One device · ${previewToken(target.token)}`;
}

export function assertValidTarget(target: SendTarget): void {
  if (target.type === "platform" && target.platform !== "android" && target.platform !== "ios") {
    throw new ApiError(400, "invalid", "Platform must be android or ios.");
  }
  if (target.type === "token" && !isValidToken(target.token)) {
    throw new ApiError(400, "invalid", "That does not look like an Expo push token (ExponentPushToken[…]).");
  }
  if (target.type !== "all" && target.type !== "platform" && target.type !== "token") {
    throw new ApiError(400, "invalid", "Unknown target.");
  }
}

function targetValue(target: SendTarget): string | null {
  if (target.type === "platform") return target.platform;
  if (target.type === "token") return target.token;
  return null;
}

export async function sendNotification(
  sb: SupabaseClient,
  config: ProjectConfig,
  request: SendRequest
): Promise<SendResponse> {
  assertValidTarget(request.target);
  const title = request.title.trim();
  const body = request.body.trim();
  const fieldErrors = validateMessage(
    { title, body, route: request.route, data: request.data, expiresAt: request.expiresAt },
    Date.now()
  );
  const firstError = Object.values(fieldErrors)[0];
  if (firstError) throw new ApiError(400, "invalid", firstError);
  if (request.target.type === "all" && !request.confirmAll) {
    throw new ApiError(400, "invalid", "Sending to every device needs explicit confirmation.");
  }

  const isBroadcast = request.target.type === "all";
  const expiresAt = new Date(request.expiresAt).toISOString();
  const tokens = await listAudienceTokens(sb, config.appId, request.target);
  if (tokens.length === 0 && !isBroadcast) throw new ApiError(400, "invalid", "No enabled devices match this audience.");

  const baseData = buildPushData(request.route, request.data);
  const broadcastId = isBroadcast
    ? await insertBroadcast(sb, { appId: config.appId, title, body, data: baseData ?? {}, expiresAt })
    : null;
  const data = buildDeliveryData(baseData, expiresAt, broadcastId);
  const messages: ExpoPushMessage[] = tokens.map((to) => ({
    to,
    title,
    body,
    data,
    sound: request.sound ? "default" : null,
    ...(request.channelId ? { channelId: request.channelId } : {}),
    priority: "high",
  }));

  const tickets = messages.length > 0 ? await sendPushMessages(messages, config.expoAccessToken) : [];
  const ticketRefs: TicketRef[] = [];
  const ticketErrors: TicketError[] = [];
  const unregistered: string[] = [];

  tickets.forEach((ticket, index) => {
    const token = tokens[index];
    if (ticket.status === "ok") {
      ticketRefs.push({ id: ticket.id, token });
      return;
    }
    const reason = ticket.details?.error ?? "Error";
    ticketErrors.push({ token, reason, message: ticket.message });
    if (reason === NOT_REGISTERED) unregistered.push(ticket.details?.expoPushToken ?? token);
  });

  const disabledTokens = await disableTokens(sb, unregistered, NOT_REGISTERED);

  let logId: string | null = null;
  let logError: string | null = null;
  try {
    logId = await insertLog(sb, {
      appId: config.appId,
      title,
      body,
      data,
      channelId: request.channelId,
      sound: request.sound,
      targetType: request.target.type,
      targetValue: targetValue(request.target),
      targetDescription: describeTarget(request.target),
      sent: messages.length,
      ok: ticketRefs.length,
      errors: ticketErrors.length,
      ticketErrors,
      tickets: ticketRefs,
    });
  } catch (error) {
    logError = error instanceof Error ? error.message : String(error);
  }

  if (broadcastId && logId) {
    await linkBroadcastLog(sb, config.appId, broadcastId, logId).catch((error: unknown) =>
      console.error("[dashboard] linking broadcast to its push log failed", error)
    );
  }

  return {
    logId,
    broadcastId,
    sent: messages.length,
    ok: ticketRefs.length,
    errors: ticketErrors.length,
    reasons: countReasons(ticketErrors),
    disabledTokens,
    logError,
  };
}

export async function checkReceipts(
  sb: SupabaseClient,
  config: ProjectConfig,
  logId: string
): Promise<ReceiptsResponse> {
  const tickets = await readTickets(sb, config.appId, logId);
  if (tickets.length === 0) {
    return { checked: 0, ok: 0, errors: 0, pending: 0, reasons: [], disabledTokens: 0 };
  }

  let receipts: Awaited<ReturnType<typeof fetchPushReceipts>>;
  try {
    receipts = await fetchPushReceipts(
      tickets.map((ticket) => ticket.id),
      config.expoAccessToken
    );
  } catch (error) {
    throw new ApiError(502, "upstream", error instanceof Error ? error.message : String(error));
  }

  let ok = 0;
  let pending = 0;
  const failures: TicketError[] = [];
  const unregistered: string[] = [];
  for (const ticket of tickets) {
    const receipt = receipts[ticket.id];
    if (!receipt) {
      pending++;
      continue;
    }
    if (receipt.status === "ok") {
      ok++;
      continue;
    }
    const reason = receipt.details?.error ?? "Error";
    failures.push({ token: ticket.token, reason, message: receipt.message });
    if (reason === NOT_REGISTERED) unregistered.push(ticket.token);
  }

  const disabledTokens = await disableTokens(sb, unregistered, NOT_REGISTERED);
  const reasons: ReasonCount[] = countReasons(failures);
  await saveReceipts(sb, config.appId, logId, { ok, errors: failures.length, reasons });

  return { checked: tickets.length - pending, ok, errors: failures.length, pending, reasons, disabledTokens };
}
