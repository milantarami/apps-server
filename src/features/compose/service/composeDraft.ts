import { routeLabel } from "../../../../shared/routes.ts";
import type { SendRequest, SendTarget } from "../../../../shared/contract.ts";
import {
  ANDROID_CHANNELS,
  buildDeliveryData,
  BROADCAST_ID_PLACEHOLDER,
  buildPushData,
  estimatePayloadBytes,
  EXPIRY_DEFAULT_MS,
  EXPIRY_MAX_MS,
  EXPIRY_MIN_MS,
  isValidToken,
  parseCustomData,
  validateMessage,
  type FieldErrors,
} from "../../../../shared/compose.ts";

export type AudienceChoice = "all" | "token";

export interface ComposeDraft {
  readonly title: string;
  readonly body: string;
  readonly route: string;
  readonly dataText: string;
  readonly channelId: string;
  readonly sound: boolean;
  readonly audience: AudienceChoice;
  readonly token: string;
  readonly expiresAt: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toLocalDateTimeInput(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function expiryBounds(now: number): { readonly min: string; readonly max: string } {
  return { min: toLocalDateTimeInput(now + EXPIRY_MIN_MS), max: toLocalDateTimeInput(now + EXPIRY_MAX_MS) };
}

function toIsoExpiry(localValue: string): string {
  const time = new Date(localValue).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

export function createEmptyDraft(now: number): ComposeDraft {
  return {
    title: "",
    body: "",
    route: "",
    dataText: "",
    channelId: ANDROID_CHANNELS[0].id,
    sound: true,
    audience: "all",
    token: "",
    expiresAt: toLocalDateTimeInput(now + EXPIRY_DEFAULT_MS),
  };
}

export interface PreviewModel {
  readonly title: string;
  readonly body: string;
  readonly isPlaceholder: boolean;
  readonly routeLabel: string | null;
  readonly channelLabel: string;
  readonly sound: boolean;
  readonly expiresAt: string;
}

export function toTarget(draft: ComposeDraft): SendTarget | null {
  if (draft.audience === "all") return { type: "all" };
  return isValidToken(draft.token) ? { type: "token", token: draft.token.trim() } : null;
}

export function validateDraft(draft: ComposeDraft, now: number): FieldErrors {
  const parsed = parseCustomData(draft.dataText);
  const errors = validateMessage(
    {
      title: draft.title,
      body: draft.body,
      route: draft.route || null,
      data: parsed.ok ? parsed.value : null,
      expiresAt: toIsoExpiry(draft.expiresAt),
    },
    now
  );
  if (!parsed.ok) errors.data = parsed.error;
  if (draft.audience === "token" && !isValidToken(draft.token)) {
    errors.token = draft.token.trim() ? "Expected ExponentPushToken[…]." : "Paste a device token.";
  }
  return errors;
}

export function toSendRequest(draft: ComposeDraft, confirmAll: boolean): SendRequest | null {
  const target = toTarget(draft);
  const parsed = parseCustomData(draft.dataText);
  if (!target || !parsed.ok) return null;
  return {
    title: draft.title.trim(),
    body: draft.body.trim(),
    route: draft.route || null,
    data: parsed.value,
    channelId: draft.channelId || null,
    sound: draft.sound,
    target,
    confirmAll,
    expiresAt: toIsoExpiry(draft.expiresAt),
  };
}

export function payloadSize(draft: ComposeDraft): number {
  const parsed = parseCustomData(draft.dataText);
  return estimatePayloadBytes(
    draft.title.trim(),
    draft.body.trim(),
    buildDeliveryData(
      buildPushData(draft.route || null, parsed.ok ? parsed.value : null),
      toIsoExpiry(draft.expiresAt),
      draft.audience === "all" ? BROADCAST_ID_PLACEHOLDER : null
    )
  );
}

export function buildPreview(draft: ComposeDraft): PreviewModel {
  const title = draft.title.trim();
  const body = draft.body.trim();
  return {
    title: title || "Your title appears here",
    body: body || "Write a short, warm line. Most phones show about two lines before truncating.",
    isPlaceholder: !title && !body,
    routeLabel: routeLabel(draft.route || null),
    channelLabel: ANDROID_CHANNELS.find((channel) => channel.id === draft.channelId)?.label ?? draft.channelId,
    sound: draft.sound,
    expiresAt: toIsoExpiry(draft.expiresAt),
  };
}

export function audienceLabel(choice: AudienceChoice): string {
  if (choice === "all") return "every in-app inbox";
  return "one device";
}
