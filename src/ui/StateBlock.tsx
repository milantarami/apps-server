import type { ReactNode } from "react";
import styles from "./StateBlock.module.css";

interface StateBlockProps {
  readonly title: string;
  readonly body?: ReactNode;
  readonly loading?: boolean;
  readonly action?: ReactNode;
}

export function StateBlock({ title, body, loading = false, action }: StateBlockProps) {
  return (
    <div className={styles.block} role={loading ? "status" : undefined} aria-live="polite">
      <p className={styles.title}>{title}</p>
      {loading ? <span className={styles.bar} aria-hidden="true" /> : null}
      {body ? <div className={styles.body}>{body}</div> : null}
      {action}
    </div>
  );
}
