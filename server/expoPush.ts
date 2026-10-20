// Written against Expo's documented push contract without live docs; verify with a real send.
const SEND_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

export const MAX_MESSAGES_PER_REQUEST = 100;
export const MAX_RECEIPT_IDS_PER_REQUEST = 1000;
const MAX_ATTEMPTS = 3;

export interface ExpoPushMessage {
  readonly to: string;
  readonly title: string;
  readonly body: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly sound?: "default" | null;
  readonly channelId?: string;
  readonly priority?: "default" | "normal" | "high";
}

interface ExpoErrorDetails {
  readonly error?: string;
  readonly expoPushToken?: string;
}

export type ExpoPushTicket =
  | { readonly status: "ok"; readonly id: string }
  | { readonly status: "error"; readonly message: string; readonly details?: ExpoErrorDetails };

export type ExpoPushReceipt =
  | { readonly status: "ok" }
  | { readonly status: "error"; readonly message: string; readonly details?: ExpoErrorDetails };

interface ExpoRequestError {
  readonly code?: string;
  readonly message?: string;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describeRequestErrors(errors: unknown, status: number): string {
  if (Array.isArray(errors) && errors.length > 0) {
    return (errors as ExpoRequestError[])
      .map((error) => [error.code, error.message].filter(Boolean).join(": "))
      .join("; ");
  }
  return `Expo push API responded with HTTP ${status}`;
}

async function postJson(url: string, payload: unknown, accessToken: string | null): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let lastError = "Expo push API unreachable";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    } catch (error) {
      lastError = `Network error: ${error instanceof Error ? error.message : String(error)}`;
      await delay(500 * 2 ** attempt);
      continue;
    }
    const json: unknown = await response.json().catch(() => null);
    const errors = (json as { errors?: unknown } | null)?.errors;
    if (response.ok && !errors) return json;
    lastError = describeRequestErrors(errors, response.status);
    if (response.status !== 429 && response.status < 500) break;
    await delay(500 * 2 ** attempt);
  }
  throw new Error(lastError);
}

export async function sendPushMessages(
  messages: readonly ExpoPushMessage[],
  accessToken: string | null
): Promise<ExpoPushTicket[]> {
  const tickets: ExpoPushTicket[] = [];
  for (const batch of chunk(messages, MAX_MESSAGES_PER_REQUEST)) {
    try {
      const json = await postJson(SEND_URL, batch, accessToken);
      const data = (json as { data?: unknown } | null)?.data;
      if (!Array.isArray(data) || data.length !== batch.length) {
        throw new Error("Expo push API returned an unexpected ticket list");
      }
      tickets.push(...(data as ExpoPushTicket[]));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (let i = 0; i < batch.length; i++)
        tickets.push({ status: "error", message, details: { error: "RequestFailed" } });
    }
  }
  return tickets;
}

export async function fetchPushReceipts(
  ids: readonly string[],
  accessToken: string | null
): Promise<Record<string, ExpoPushReceipt>> {
  const receipts: Record<string, ExpoPushReceipt> = {};
  for (const batch of chunk(ids, MAX_RECEIPT_IDS_PER_REQUEST)) {
    const json = await postJson(RECEIPTS_URL, { ids: batch }, accessToken);
    const data = (json as { data?: unknown } | null)?.data;
    if (data && typeof data === "object") Object.assign(receipts, data as Record<string, ExpoPushReceipt>);
  }
  return receipts;
}
