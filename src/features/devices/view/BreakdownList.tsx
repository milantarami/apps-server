import type { CSSProperties } from "react";
import styles from "./Devices.module.css";
import { formatCount } from "../../../ui/format.ts";
import type { Breakdown } from "../../../../shared/contract.ts";

interface BreakdownListProps {
  readonly title: string;
  readonly items: readonly Breakdown[];
}

export function BreakdownList({ title, items }: BreakdownListProps) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className={styles.breakdown} aria-label={title}>
      <h3 className={styles.breakdownTitle}>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.muted}>No enabled devices yet.</p>
      ) : (
        <ul className={styles.bars}>
          {items.map((item) => (
            <li key={item.label} className={styles.bar}>
              <span className={styles.barLabel}>{item.label}</span>
              <span className={styles.barCount}>{formatCount(item.count)}</span>
              <span className={styles.barTrack} aria-hidden="true">
                <span className={styles.barFill} style={{ "--share": item.count / max } as CSSProperties} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
