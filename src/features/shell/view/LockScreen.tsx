import { useState, type FormEvent } from "react";
import styles from "./Gate.module.css";
import { Button } from "../../../ui/Button.tsx";
import form from "../../../ui/Form.module.css";
import { FieldError } from "../../../ui/FieldError.tsx";

interface LockScreenProps {
  readonly onUnlock: (password: string) => Promise<string | null>;
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(await onUnlock(password));
    setBusy(false);
  };

  return (
    <main className={styles.page}>
      <div>
        <p className={styles.eyebrow}>Locked</p>
        <h2 className={styles.title}>
          Who's <em>sending</em>?
        </h2>
      </div>
      <form className={styles.form} onSubmit={submit}>
        <div className={form.field}>
          <label className={form.label} htmlFor="dashboard-password">
            Dashboard password
          </label>
          <input
            id="dashboard-password"
            className={`${form.control} ${error ? form.invalid : ""}`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "dashboard-password-error" : undefined}
            autoFocus
          />
          <FieldError id="dashboard-password-error" message={error ?? undefined} />
          <p className={form.hint}>Set by DASHBOARD_PASSWORD in dashboard/.env. Kept for this browser tab only.</p>
        </div>
        <div className={styles.actions}>
          <Button type="submit" variant="primary" loading={busy} disabled={!password}>
            Unlock
          </Button>
        </div>
      </form>
    </main>
  );
}
