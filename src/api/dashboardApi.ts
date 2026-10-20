import type {
  ApiErrorBody,
  ApiErrorCode,
  AudienceResponse,
  DevicesResponse,
  HistoryResponse,
  ReceiptsResponse,
  SendRequest,
  SendResponse,
  SendTarget,
  StatusResponse,
} from "../../shared/contract.ts";

const PASSWORD_KEY = "push-dashboard/password";

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode | "network";

  constructor(message: string, status: number, code: ApiErrorCode | "network") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

let password: string | null = sessionStorage.getItem(PASSWORD_KEY);
const unauthorizedListeners = new Set<() => void>();

export function setPassword(value: string | null): void {
  password = value;
  if (value) sessionStorage.setItem(PASSWORD_KEY, value);
  else sessionStorage.removeItem(PASSWORD_KEY);
}

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

interface RequestOptions {
  readonly method?: "GET" | "POST";
  readonly body?: unknown;
  readonly signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "x-dashboard-request": "1" };
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (password) headers["x-dashboard-password"] = password;

  let response: Response;
  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError("Can't reach the dashboard server. Is `pnpm dev` still running?", 0, "network");
  }

  const json: unknown = await response.json().catch(() => null);
  if (response.ok) return json as T;

  const body = json as Partial<ApiErrorBody> | null;
  if (response.status === 401) for (const listener of unauthorizedListeners) listener();
  throw new ApiRequestError(
    body?.error ?? `Request failed with HTTP ${response.status}.`,
    response.status,
    body?.code ?? "upstream"
  );
}

function projectQuery(project: string, extra: Record<string, string> = {}): string {
  return new URLSearchParams({ project, ...extra }).toString();
}

function targetParams(target: SendTarget): Record<string, string> {
  const value = target.type === "platform" ? target.platform : target.type === "token" ? target.token : "";
  return value ? { type: target.type, value } : { type: target.type };
}

export const dashboardApi = {
  status: (signal?: AbortSignal) => request<StatusResponse>("/api/status", { signal }),
  session: () => request<{ ok: true }>("/api/session"),
  audience: (project: string, target: SendTarget, signal?: AbortSignal) =>
    request<AudienceResponse>(`/api/audience?${projectQuery(project, targetParams(target))}`, { signal }),
  send: (project: string, payload: SendRequest) =>
    request<SendResponse>(`/api/send?${projectQuery(project)}`, { method: "POST", body: payload }),
  receipts: (project: string, logId: string) =>
    request<ReceiptsResponse>(`/api/sends/${encodeURIComponent(logId)}/receipts?${projectQuery(project)}`, {
      method: "POST",
      body: {},
    }),
  devices: (project: string, signal?: AbortSignal) =>
    request<DevicesResponse>(`/api/devices?${projectQuery(project)}`, { signal }),
  disableDevice: (project: string, id: string) =>
    request<{ ok: true }>(`/api/devices/${encodeURIComponent(id)}/disable?${projectQuery(project)}`, {
      method: "POST",
      body: {},
    }),
  history: (project: string, signal?: AbortSignal) =>
    request<HistoryResponse>(`/api/history?${projectQuery(project)}`, { signal }),
};
