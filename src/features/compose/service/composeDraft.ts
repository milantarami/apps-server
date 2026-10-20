import { routeLabel } from "../../../../shared/routes.ts";
import type { SendRequest, SendTarget } from "../../../../shared/contract.ts";
import {
  ANDROID_CHANNELS,
  buildPushData,
  estimatePayloadBytes,
  isValidToken,
  parseCustomData,
  validateMessage,
  type FieldErrors,
} from "../../../../shared/compose.ts";

export type AudienceChoice = "all" | "android" | "ios" | "token";

export interface ComposeDraft {
  readonly title: string;
  readonly body: string;
  readonly route: string;
  readonly dataText: string;
  readonly channelId: string;
  readonly sound: boolean;
  readonly audience: AudienceChoice;
  readonly token: string;
}

export const EMPTY_DRAFT: ComposeDraft = {
  title: "",
  body: "",
  route: "",
  dataText: "",
  channelId: ANDROID_CHANNELS[0].id,
  sound: true,
  audience: "token",
  token: "",
};

export interface PreviewModel {
  readonly title: string;
  readonly body: string;
  readonly isPlaceholder: boolean;
  readonly routeLabel: string | null;
  readonly channelLabel: string;
  readonly sound: boolean;
}

export function toTarget(draft: ComposeDraft): SendTarget | null {
  if (draft.audience === "all") return { type: "all" };
  if (draft.audience === "android" || draft.audience === "ios") return { type: "platform", platform: draft.audience };
  return isValidToken(draft.token) ? { type: "token", token: draft.token.trim() } : null;
}

export function validateDraft(draft: ComposeDraft): FieldErrors {
  const parsed = parseCustomData(draft.dataText);
  const errors = validateMessage({
    title: draft.title,
    body: draft.body,
    route: draft.route || null,
    data: parsed.ok ? parsed.value : null,
  });
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
  };
}

export function payloadSize(draft: ComposeDraft): number {
  const parsed = parseCustomData(draft.dataText);
  return estimatePayloadBytes(
    draft.title.trim(),
    draft.body.trim(),
    buildPushData(draft.route || null, parsed.ok ? parsed.value : null)
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
  };
}

export function audienceLabel(choice: AudienceChoice): string {
  if (choice === "all") return "every enabled device";
  if (choice === "android") return "every Android device";
  if (choice === "ios") return "every iOS device";
  return "one device";
}
