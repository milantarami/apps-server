import { useCallback, useState } from "react";
import type { ProjectSummary } from "../../../shared/contract.ts";

const PROJECT_KEY = "push-dashboard/project";

function readStored(): string | null {
  try {
    return localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
}

function store(id: string): void {
  try {
    localStorage.setItem(PROJECT_KEY, id);
  } catch {
    // Selection still works for this session without storage.
  }
}

export function useProjectSelection(
  projects: readonly ProjectSummary[]
): readonly [ProjectSummary | null, (id: string) => void] {
  const [chosen, setChosen] = useState<string | null>(readStored);
  const selected = projects.find((project) => project.id === chosen) ?? projects[0] ?? null;

  const select = useCallback((id: string) => {
    setChosen(id);
    store(id);
  }, []);

  return [selected, select] as const;
}
