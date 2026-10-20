import { useState } from "react";
import { useLoader } from "../../ui/useLoader.ts";
import { dashboardApi } from "../../api/dashboardApi.ts";

export function useDevices(project: string) {
  const devices = useLoader((signal) => dashboardApi.devices(project, signal));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const disable = async (id: string) => {
    setBusyId(id);
    setActionError(null);
    try {
      await dashboardApi.disableDevice(project, id);
      devices.reload();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyId(null);
    }
  };

  return {
    data: devices.data,
    error: devices.error,
    loading: devices.loading,
    reload: devices.reload,
    busyId,
    actionError,
    disable,
  };
}
