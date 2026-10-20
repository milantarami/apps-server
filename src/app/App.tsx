import { useState } from "react";
import styles from "./App.module.css";
import { Button } from "../ui/Button.tsx";
import { StateBlock } from "../ui/StateBlock.tsx";
import { useHashTab } from "../features/shell/useHashTab.ts";
import { Masthead } from "../features/shell/view/Masthead.tsx";
import { LockScreen } from "../features/shell/view/LockScreen.tsx";
import { SetupScreen } from "../features/shell/view/SetupScreen.tsx";
import { useDashboardStatus } from "../features/shell/useDashboardStatus.ts";
import { useProjectSelection } from "../features/shell/useProjectSelection.ts";
import { HistoryScreen } from "../features/history/view/HistoryScreen.tsx";
import { ComposeScreen } from "../features/compose/view/ComposeScreen.tsx";
import { DevicesScreen } from "../features/devices/view/DevicesScreen.tsx";

export function App() {
  const { state, retry, unlock } = useDashboardStatus();
  const [tab, setTab] = useHashTab();
  const [prefillToken, setPrefillToken] = useState<string | null>(null);

  const status = state.kind === "ready" || state.kind === "setup" ? state.status : null;
  const [project, setProject] = useProjectSelection(status?.projects ?? []);
  const projectName = project && (status?.projects.length ?? 0) > 1 ? project.name : null;

  const testDevice = (token: string) => {
    setPrefillToken(token);
    setTab("compose");
  };

  const selectProject = (id: string) => {
    setPrefillToken(null);
    setProject(id);
  };

  const ready = state.kind === "ready" && project !== null;

  return (
    <>
      <a className={styles.skip} href="#main">
        Skip to content
      </a>
      <Masthead
        status={status}
        project={project}
        onProject={selectProject}
        tab={ready ? tab : null}
        onTab={setTab}
      />
      <div id="main">
        {state.kind === "loading" ? (
          <div className={styles.center}>
            <StateBlock title="Opening the push desk" loading />
          </div>
        ) : null}
        {state.kind === "unreachable" ? (
          <div className={styles.center}>
            <StateBlock
              title="The dashboard server isn't answering"
              body={state.message}
              action={
                <Button variant="primary" onClick={retry}>
                  Try again
                </Button>
              }
            />
          </div>
        ) : null}
        {state.kind === "locked" ? <LockScreen onUnlock={unlock} /> : null}
        {state.kind === "setup" ? <SetupScreen problems={state.status.problems} onRetry={retry} /> : null}
        {ready && tab === "compose" ? (
          <ComposeScreen
            project={project.id}
            appName={project.name}
            projectName={projectName}
            prefillToken={prefillToken}
          />
        ) : null}
        {ready && tab === "devices" ? <DevicesScreen key={project.id} project={project.id} onTest={testDevice} /> : null}
        {ready && tab === "history" ? (
          <HistoryScreen key={project.id} project={project.id} onCompose={() => setTab("compose")} />
        ) : null}
      </div>
    </>
  );
}
