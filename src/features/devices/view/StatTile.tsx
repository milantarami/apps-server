import styles from "./Devices.module.css";
import { formatCount } from "../../../ui/format.ts";

interface StatTileProps {
  readonly label: string;
  readonly value: number;
  readonly lead?: boolean;
}

export function StatTile({ label, value, lead = false }: StatTileProps) {
  return (
    <div className={`${styles.stat} ${lead ? styles.statLead : ""}`}>
      <span className={styles.statValue}>{formatCount(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
