import { useCallback, useEffect, useState } from "react";

export const TABS = ["compose", "devices", "history"] as const;

export type Tab = (typeof TABS)[number];

function readTab(): Tab {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : "compose";
}

export function useHashTab(): readonly [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(readTab);

  useEffect(() => {
    const onChange = () => setTab(readTab());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: Tab) => {
    window.location.hash = `/${next}`;
  }, []);

  return [tab, navigate] as const;
}
