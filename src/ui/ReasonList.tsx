import { formatCount } from "./format.ts";
import styles from "./ReasonList.module.css";
import { explainExpoError } from "./expoErrors.ts";
import type { ReasonCount } from "../../shared/contract.ts";

interface ReasonListProps {
  readonly reasons: readonly ReasonCount[];
}

export function ReasonList({ reasons }: ReasonListProps) {
  if (reasons.length === 0) return null;
  return (
    <ul className={styles.list}>
      {reasons.map(({ reason, count }) => {
        const explanation = explainExpoError(reason);
        return (
          <li key={reason} className={styles.item}>
            <span className={styles.count}>×{formatCount(count)}</span>
            <span className={styles.reason}>{reason}</span>
            {explanation ? <span className={styles.explain}>{explanation}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
