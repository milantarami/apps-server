export type DevicePlatform = "android" | "ios";

export type SendTarget =
  | { readonly type: "all" }
  | { readonly type: "platform"; readonly platform: DevicePlatform }
  | { readonly type: "token"; readonly token: string };

export interface SendRequest {
  readonly title: string;
  readonly body: string;
  readonly route: string | null;
  readonly data: Readonly<Record<string, unknown>> | null;
  readonly channelId: string | null;
  readonly sound: boolean;
  readonly target: SendTarget;
  readonly confirmAll: boolean;
}

export interface ReasonCount {
  readonly reason: string;
  readonly count: number;
}

export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
  readonly appId: number;
  readonly hasExpoAccessToken: boolean;
}

export interface StatusResponse {
  readonly configured: boolean;
  readonly problems: readonly string[];
  readonly projects: readonly ProjectSummary[];
  readonly passwordRequired: boolean;
}

export interface AudienceResponse {
  readonly count: number;
}

export interface SendResponse {
  readonly logId: string | null;
  readonly sent: number;
  readonly ok: number;
  readonly errors: number;
  readonly reasons: readonly ReasonCount[];
  readonly disabledTokens: number;
  readonly logError: string | null;
}

export interface ReceiptsResponse {
  readonly checked: number;
  readonly ok: number;
  readonly errors: number;
  readonly pending: number;
  readonly reasons: readonly ReasonCount[];
  readonly disabledTokens: number;
}

export interface DeviceRow {
  readonly id: string;
  readonly token: string;
  readonly platform: DevicePlatform;
  readonly appVersion: string | null;
  readonly locale: string | null;
  readonly timezone: string | null;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
  readonly lastSeenAt: string;
  readonly createdAt: string;
}

export interface Breakdown {
  readonly label: string;
  readonly count: number;
}

export interface DevicesResponse {
  readonly total: number;
  readonly enabled: number;
  readonly byPlatform: readonly Breakdown[];
  readonly byVersion: readonly Breakdown[];
  readonly byLocale: readonly Breakdown[];
  readonly devices: readonly DeviceRow[];
  readonly truncated: boolean;
}

export interface HistoryEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly title: string;
  readonly body: string;
  readonly route: string | null;
  readonly channelId: string | null;
  readonly sound: boolean;
  readonly targetDescription: string;
  readonly sent: number;
  readonly ok: number;
  readonly errors: number;
  readonly reasons: readonly ReasonCount[];
  readonly receiptsCheckedAt: string | null;
  readonly receiptOk: number | null;
  readonly receiptErrors: number | null;
  readonly receiptReasons: readonly ReasonCount[];
}

export interface HistoryResponse {
  readonly entries: readonly HistoryEntry[];
}

export type ApiErrorCode = "not_configured" | "unauthorized" | "forbidden" | "invalid" | "upstream" | "not_found";

export interface ApiErrorBody {
  readonly error: string;
  readonly code: ApiErrorCode;
}
