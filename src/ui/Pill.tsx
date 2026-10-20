import type { ReactNode } from "react";
import styles from "./Pill.module.css";

interface PillProps {
  readonly tone?: "neutral" | "accent" | "success" | "warn" | "danger";
  readonly dot?: boolean;
  readonly children: ReactNode;
}

export function Pill({ tone = "neutral", dot = false, children }: PillProps) {
  return (
    <span className={`${styles.pill} ${styles[tone]}`}>
      {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
