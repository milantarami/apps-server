import { useEffect, useRef, useState } from "react";
import type { SendTarget } from "../../../shared/contract.ts";
import { dashboardApi, isAbortError } from "../../api/dashboardApi.ts";

const DEBOUNCE_MS = 250;

export interface AudienceCount {
  readonly count: number | null;
  readonly loading: boolean;
  readonly error: string | null;
}

function targetKey(target: SendTarget | null): string {
  if (!target) return "";
  if (target.type === "platform") return `platform:${target.platform}`;
  if (target.type === "token") return `token:${target.token}`;
  return "all";
}

export function useAudienceCount(project: string, target: SendTarget | null, refreshKey: number): AudienceCount {
  const [state, setState] = useState<AudienceCount>({ count: null, loading: false, error: null });
  const key = targetKey(target);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const current = targetRef.current;
    if (!current) {
      setState({ count: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      dashboardApi
        .audience(project, current, controller.signal)
        .then(({ count }) => setState({ count, loading: false, error: null }))
        .catch((error: unknown) => {
          if (isAbortError(error)) return;
          setState({ count: null, loading: false, error: error instanceof Error ? error.message : String(error) });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [project, key, refreshKey]);

  return state;
}
