import { useEffect, useState } from "react";
import { useLoader } from "../../ui/useLoader.ts";
import type { StatusResponse } from "../../../shared/contract.ts";
import { ApiRequestError, dashboardApi, onUnauthorized, setPassword } from "../../api/dashboardApi.ts";

export type ShellState =
  | { readonly kind: "loading" }
  | { readonly kind: "unreachable"; readonly message: string }
  | { readonly kind: "setup"; readonly status: StatusResponse }
  | { readonly kind: "locked" }
  | { readonly kind: "ready"; readonly status: StatusResponse };

interface DashboardStatus {
  readonly state: ShellState;
  readonly retry: () => void;
  readonly unlock: (password: string) => Promise<string | null>;
}

export function useDashboardStatus(): DashboardStatus {
  const status = useLoader((signal) => dashboardApi.status(signal));
  const [unlocked, setUnlocked] = useState<boolean | null>(null);

  useEffect(() => onUnauthorized(() => setUnlocked(false)), []);

  useEffect(() => {
    if (!status.data?.passwordRequired) return;
    let active = true;
    dashboardApi
      .session()
      .then(() => active && setUnlocked(true))
      .catch(() => active && setUnlocked(false));
    return () => {
      active = false;
    };
  }, [status.data]);

  const unlock = async (password: string): Promise<string | null> => {
    setPassword(password);
    try {
      await dashboardApi.session();
      setUnlocked(true);
      return null;
    } catch (error) {
      setPassword(null);
      if (error instanceof ApiRequestError && error.status === 401)
        return "That password doesn't match DASHBOARD_PASSWORD.";
      return error instanceof Error ? error.message : "Could not unlock.";
    }
  };

  let state: ShellState;
  if (status.error) state = { kind: "unreachable", message: status.error.message };
  else if (!status.data) state = { kind: "loading" };
  else if (status.data.passwordRequired && unlocked === null) state = { kind: "loading" };
  else if (status.data.passwordRequired && !unlocked) state = { kind: "locked" };
  else if (!status.data.configured) state = { kind: "setup", status: status.data };
  else state = { kind: "ready", status: status.data };

  return { state, retry: status.reload, unlock };
}
