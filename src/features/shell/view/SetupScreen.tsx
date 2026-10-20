import styles from "./Gate.module.css";
import { Button } from "../../../ui/Button.tsx";
import { Notice } from "../../../ui/Notice.tsx";

interface SetupScreenProps {
  readonly problems: readonly string[];
  readonly onRetry: () => void;
}

export function SetupScreen({ problems, onRetry }: SetupScreenProps) {
  return (
    <main className={styles.page}>
      <div>
        <p className={styles.eyebrow}>Setup needed</p>
        <h2 className={styles.title}>
          Almost ready to <em>send</em>.
        </h2>
      </div>
      <p className={styles.lede}>The dashboard server is running, but it can't talk to Supabase yet.</p>
      <Notice tone="warn" title="What's missing">
        <ul>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </Notice>
      <ol className={styles.steps}>
        <li className={styles.step}>
          <span className={styles.stepTitle}>Apply the migration</span>
          <span className={styles.stepBody}>
            Paste <code className={styles.code}>scripts/sql/push_notifications.sql</code> into the Supabase SQL editor
            and run it once.
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.stepTitle}>Create the env file</span>
          <span className={styles.stepBody}>
            Copy <code className={styles.code}>dashboard/.env.example</code> to{" "}
            <code className={styles.code}>dashboard/.env</code> and add the project URL and the secret key from Settings
            → API Keys.
          </span>
        </li>
        <li className={styles.step}>
          <span className={styles.stepTitle}>Restart the dashboard</span>
          <span className={styles.stepBody}>
            Stop <code className={styles.code}>pnpm dev</code> and start it again so the new values load.
          </span>
        </li>
      </ol>
      <div className={styles.actions}>
        <Button variant="primary" onClick={onRetry}>
          Check again
        </Button>
      </div>
    </main>
  );
}
