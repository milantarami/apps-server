import styles from "./History.module.css";
import { Pill } from "../../../ui/Pill.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Notice } from "../../../ui/Notice.tsx";
import type { ReceiptCheck } from "../useHistory.ts";
import { ReasonList } from "../../../ui/ReasonList.tsx";
import { routeLabel } from "../../../../shared/routes.ts";
import type { HistoryEntry } from "../../../../shared/contract.ts";
import { formatCount, formatDateTime, formatRelative } from "../../../ui/format.ts";

interface HistoryEntryItemProps {
  readonly entry: HistoryEntry;
  readonly check: ReceiptCheck | undefined;
  readonly onCheckReceipts: (id: string) => void;
}

export function HistoryEntryItem({ entry, check, onCheckReceipts }: HistoryEntryItemProps) {
  const reasons = [...entry.reasons, ...entry.receiptReasons];
  return (
    <li className={styles.entry}>
      <time className={styles.when} dateTime={entry.createdAt}>
        {formatDateTime(entry.createdAt)}
      </time>
      <div className={styles.message}>
        <p className={styles.title}>{entry.title}</p>
        <p className={styles.body}>{entry.body}</p>
        <div className={styles.chips}>
          <Pill>{entry.targetDescription}</Pill>
          {entry.route ? <Pill tone="accent">Opens {routeLabel(entry.route)}</Pill> : null}
          {entry.channelId ? <Pill>Channel {entry.channelId}</Pill> : null}
          <Pill>{entry.sound ? "Sound on" : "Silent"}</Pill>
        </div>
      </div>
      <div className={styles.tally}>
        <div className={styles.numbers}>
          <span>
            <span className={styles.ok}>{formatCount(entry.ok)}</span> ok
          </span>
          <span>
            <span className={entry.errors > 0 ? styles.bad : ""}>{formatCount(entry.errors)}</span> errors
          </span>
          <span>{formatCount(entry.sent)} sent</span>
        </div>
        <p className={styles.receipt}>
          {entry.receiptsCheckedAt
            ? `Receipts ${formatRelative(entry.receiptsCheckedAt)}: ${formatCount(entry.receiptOk ?? 0)} ok, ${formatCount(entry.receiptErrors ?? 0)} failed`
            : "Receipts not checked yet"}
        </p>
        {entry.ok > 0 ? (
          <div>
            <Button variant="secondary" onClick={() => onCheckReceipts(entry.id)} loading={check?.loading}>
              Check receipts
            </Button>
          </div>
        ) : null}
      </div>
      {reasons.length > 0 || check?.error || (check?.result && check.result.pending > 0) ? (
        <div className={styles.details}>
          <ReasonList reasons={reasons} />
          {check?.result && check.result.pending > 0 ? (
            <Notice tone="info">
              {formatCount(check.result.pending)} receipts aren't ready yet. Try again in a few minutes.
            </Notice>
          ) : null}
          {check?.error ? <Notice tone="error">{check.error}</Notice> : null}
        </div>
      ) : null}
    </li>
  );
}
