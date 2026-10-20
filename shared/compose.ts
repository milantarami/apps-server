import { isKnownRoute } from "./routes.ts";

export const TITLE_MAX = 120;
export const BODY_MAX = 1000;
// Unverified locally: Expo documents a ~4 KB total payload cap; keep a margin for platform overhead.
export const PAYLOAD_BUDGET_BYTES = 3800;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
export const EXPIRY_DEFAULT_MS = 7 * DAY_MS;
export const EXPIRY_MIN_MS = HOUR_MS;
export const EXPIRY_MAX_MS = 30 * DAY_MS;
export const BROADCAST_ID_KEY = "notification_id";
export const EXPIRES_AT_KEY = "expires_at";
export const BROADCAST_ID_PLACEHOLDER = "00000000-0000-0000-0000-000000000000";

export const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/;

export interface ChannelOption {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
}

export const ANDROID_CHANNELS: readonly ChannelOption[] = [
  { id: "updates", label: "Updates", hint: "Created by the app. Shown in the tray without a heads-up banner." },
  { id: "default", label: "Miscellaneous", hint: "Not created by the app; Android falls back to “Miscellaneous”." },
];

const RESERVED_DATA_KEYS = ["url", "momentId", BROADCAST_ID_KEY, EXPIRES_AT_KEY, "expiresAt"] as const;

export type ComposeField = "title" | "body" | "route" | "data" | "token" | "expiresAt";

export type FieldErrors = Partial<Record<ComposeField, string>>;

export type ParsedData =
  | { readonly ok: true; readonly value: Readonly<Record<string, unknown>> | null }
  | { readonly ok: false; readonly error: string };

export function parseCustomData(text: string): ParsedData {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true, value: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Not valid JSON." };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Must be a JSON object, like {"campaign": "spring"}.' };
  }
  const reserved = RESERVED_DATA_KEYS.find((key) => key in parsed);
  if (reserved) return { ok: false, error: `“${reserved}” is reserved. Use the route picker and expiry fields instead.` };
  return { ok: true, value: parsed as Record<string, unknown> };
}

export function buildPushData(
  route: string | null,
  custom: Readonly<Record<string, unknown>> | null
): Record<string, unknown> | null {
  if (!route && !custom) return null;
  return route ? { ...custom, url: route } : { ...custom };
}

export function buildDeliveryData(
  data: Readonly<Record<string, unknown>> | null,
  expiresAt: string,
  broadcastId: string | null
): Record<string, unknown> {
  return { ...data, ...(broadcastId ? { [BROADCAST_ID_KEY]: broadcastId } : {}), [EXPIRES_AT_KEY]: expiresAt };
}

export function validateExpiry(expiresAt: string, now: number): string | undefined {
  const time = Date.parse(expiresAt);
  if (!expiresAt || !Number.isFinite(time)) return "Pick when this expires.";
  if (time < now + EXPIRY_MIN_MS) return "Pick a time at least an hour from now.";
  if (time > now + EXPIRY_MAX_MS) return "Keep it within 30 days.";
  return undefined;
}

export function estimatePayloadBytes(
  title: string,
  body: string,
  data: Readonly<Record<string, unknown>> | null
): number {
  return new TextEncoder().encode(JSON.stringify({ title, body, data })).length;
}

export interface ComposeInput {
  readonly title: string;
  readonly body: string;
  readonly route: string | null;
  readonly data: Readonly<Record<string, unknown>> | null;
  readonly expiresAt: string;
}

export function validateMessage(input: ComposeInput, now: number): FieldErrors {
  const errors: FieldErrors = {};
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) errors.title = "Add a title.";
  else if (title.length > TITLE_MAX) errors.title = `Keep it under ${TITLE_MAX} characters.`;
  if (!body) errors.body = "Add a message.";
  else if (body.length > BODY_MAX) errors.body = `Keep it under ${BODY_MAX} characters.`;
  if (input.route && !isKnownRoute(input.route)) errors.route = "The app does not know this screen.";
  const expiryError = validateExpiry(input.expiresAt, now);
  if (expiryError) errors.expiresAt = expiryError;
  const bytes = estimatePayloadBytes(
    title,
    body,
    buildDeliveryData(buildPushData(input.route, input.data), input.expiresAt, BROADCAST_ID_PLACEHOLDER)
  );
  if (bytes > PAYLOAD_BUDGET_BYTES) errors.data = `Payload is ${bytes} bytes; keep it under ${PAYLOAD_BUDGET_BYTES}.`;
  return errors;
}

export function isValidToken(token: string): boolean {
  return TOKEN_PATTERN.test(token.trim());
}

export function previewToken(token: string): string {
  const match = /^(Expo(?:nent)?PushToken\[)(.*)(\])$/.exec(token);
  if (!match) return token.length > 16 ? `${token.slice(0, 8)}…${token.slice(-4)}` : token;
  const inner = match[2];
  const shown = inner.length > 10 ? `${inner.slice(0, 4)}…${inner.slice(-4)}` : inner;
  return `${match[1]}${shown}${match[3]}`;
}
