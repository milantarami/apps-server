import { Pill } from "../../../ui/Pill.tsx";
import styles from "./Masthead.module.css";
import formStyles from "../../../ui/Form.module.css";
import { TABS, type Tab } from "../useHashTab.ts";
import type { ProjectSummary, StatusResponse } from "../../../../shared/contract.ts";

const TAB_LABELS: Record<Tab, string> = {
  compose: "Compose",
  devices: "Devices",
  history: "History",
};

interface MastheadProps {
  readonly status: StatusResponse | null;
  readonly project: ProjectSummary | null;
  readonly onProject: (id: string) => void;
  readonly tab: Tab | null;
  readonly onTab: (tab: Tab) => void;
}

export function Masthead({ status, project, onProject, tab, onTab }: MastheadProps) {
  const projects = status?.projects ?? [];

  return (
    <header className={styles.masthead}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <span className={styles.kicker}>{project ? `${project.name} · Push desk` : "Push desk"}</span>
            <h1 className={styles.wordmark}>
              The <strong>Dispatch</strong>
            </h1>
          </div>
          {status?.configured && project ? (
            <div className={styles.controls}>
              {projects.length > 1 ? (
                <label className={styles.project}>
                  <span className={styles.projectLabel}>Project</span>
                  <select
                    className={`${formStyles.control} ${formStyles.select} ${styles.projectSelect}`}
                    value={project.id}
                    onChange={(event) => onProject(event.target.value)}
                  >
                    {projects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className={styles.status} aria-label="Connection status">
                <Pill tone="success" dot>
                  Supabase configured
                </Pill>
                <Pill>App {project.appId}</Pill>
                <Pill>Expo token {project.hasExpoAccessToken ? "set" : "not set"}</Pill>
                {status.passwordRequired ? <Pill>Password on</Pill> : null}
              </div>
            </div>
          ) : null}
        </div>
        {tab ? (
          <nav className={styles.nav} aria-label="Sections">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.tab} ${item === tab ? styles.active : ""}`}
                aria-current={item === tab ? "page" : undefined}
                onClick={() => onTab(item)}
              >
                {TAB_LABELS[item]}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
