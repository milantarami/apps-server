import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "../api/dashboardApi.ts";

export interface LoaderState<T> {
  readonly data: T | null;
  readonly error: Error | null;
  readonly loading: boolean;
  readonly reload: () => void;
}

export function useLoader<T>(load: (signal: AbortSignal) => Promise<T>): LoaderState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    loadRef
      .current(controller.signal)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) return;
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { data, error, loading, reload };
}
