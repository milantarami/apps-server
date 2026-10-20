import { useState } from "react";
import { useLoader } from "../../ui/useLoader.ts";
import { dashboardApi } from "../../api/dashboardApi.ts";
import type { ReceiptsResponse } from "../../../shared/contract.ts";

export interface ReceiptCheck {
  readonly loading: boolean;
  readonly result: ReceiptsResponse | null;
  readonly error: string | null;
}

export function useHistory(project: string) {
  const history = useLoader((signal) => dashboardApi.history(project, signal));
  const [checks, setChecks] = useState<Readonly<Record<string, ReceiptCheck>>>({});

  const checkReceipts = async (id: string) => {
    setChecks((current) => ({ ...current, [id]: { loading: true, result: null, error: null } }));
    try {
      const result = await dashboardApi.receipts(project, id);
      setChecks((current) => ({ ...current, [id]: { loading: false, result, error: null } }));
      history.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setChecks((current) => ({ ...current, [id]: { loading: false, result: null, error: message } }));
    }
  };

  return {
    entries: history.data?.entries ?? null,
    error: history.error,
    loading: history.loading,
    reload: history.reload,
    checks,
    checkReceipts,
  };
}
