import type { ApiErrorCode } from "../shared/contract.ts";

export class ApiError extends Error {
  readonly status: 400 | 401 | 403 | 404 | 502 | 503;
  readonly code: ApiErrorCode;

  constructor(status: ApiError["status"], code: ApiErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface PostgrestLikeError {
  readonly message?: string;
  readonly code?: string;
  readonly hint?: string | null;
}

export function fromSupabase(action: string, error: PostgrestLikeError): ApiError {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new ApiError(
      503,
      "not_configured",
      "Push tables are missing. Run the app's scripts/sql/push_notifications.sql in Supabase."
    );
  }
  if (error.code === "42501") {
    return new ApiError(
      503,
      "not_configured",
      "Supabase refused access. Check that the key is the secret/service_role key."
    );
  }
  if (error.message?.includes("fetch failed")) {
    return new ApiError(
      502,
      "upstream",
      "Can't reach Supabase. Check SUPABASE_URL and your connection; free projects pause after inactivity and need a restore."
    );
  }
  return new ApiError(502, "upstream", `Supabase ${action} failed: ${error.message ?? "unknown error"}`);
}
