import styles from "./Report.module.css";
import { Pill } from "../../../ui/Pill.tsx";
import { Button } from "../../../ui/Button.tsx";
import { Notice } from "../../../ui/Notice.tsx";
import type { ReceiptState } from "../useCompose.ts";
import { ReasonList } from "../../../ui/ReasonList.tsx";
import { formatCount, plural } from "../../../ui/format.ts";
import type { SendResponse } from "../../../../shared/contract.ts";

interface SendResultPanelProps {
  readonly result: SendResponse;
  readonly receipts: ReceiptState;
  readonly onCheckReceipts: (logId: string) => void;
}

export function SendResultPanel({ result, receipts, onCheckReceipts }: SendResultPanelProps) {
  const inboxOnly = result.broadcastId !== null && result.sent === 0;
  const allFailed = result.ok === 0 && !inboxOnly;
  const receiptResult = receipts.result;
  return (
    <section className={styles.report} aria-live="polite" aria-labelledby="report-heading">
      <div className={styles.head}>
        <h3 className={styles.title} id="report-heading">
          {inboxOnly ? "Posted to the in-app inbox" : allFailed ? "Expo rejected this send" : "Handed to Expo"}
        </h3>
        <Pill tone={allFailed ? "danger" : result.errors > 0 ? "warn" : "success"} dot>
          {inboxOnly ? "In-app only" : allFailed ? "Failed" : result.errors > 0 ? "Partly sent" : "Accepted"}
        </Pill>
      </div>
      {result.broadcastId ? (
        <Notice tone="info">
          {inboxOnly
            ? "No device has push on, so nothing was pushed. Every user still sees it in the app's notifications."
            : "Also posted to every user's in-app notifications, including people with push off."}
        </Notice>
      ) : null}
      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt>messages</dt>
          <dd>{formatCount(result.sent)}</dd>
        </div>
        <div className={`${styles.figure} ${styles.ok}`}>
          <dt>tickets ok</dt>
          <dd>{formatCount(result.ok)}</dd>
        </div>
        <div className={`${styles.figure} ${result.errors > 0 ? styles.bad : ""}`}>
          <dt>errors</dt>
          <dd>{formatCount(result.errors)}</dd>
        </div>
      </dl>
      <ReasonList reasons={result.reasons} />
      {result.disabledTokens > 0 ? (
        <Notice tone="info">
          {plural(result.disabledTokens, "uninstalled device was", "uninstalled devices were")} switched off.
        </Notice>
      ) : null}
      {result.logError ? (
        <Notice tone="warn" title="Sent, but not logged">
          {result.logError}
        </Notice>
      ) : null}
      {result.logId && result.ok > 0 ? (
        <div className={styles.row}>
          <span>
            {receipts.loading
              ? "Checking delivery receipts…"
              : receiptResult
                ? `Receipts: ${formatCount(receiptResult.ok)} delivered to Apple/Google, ${formatCount(receiptResult.errors)} failed, ${formatCount(receiptResult.pending)} pending.`
                : "Tickets mean Expo accepted the message. Receipts confirm the hand-off to Apple/Google; they're checked automatically in 15 s."}
          </span>
          <Button
            variant="secondary"
            onClick={() => result.logId && onCheckReceipts(result.logId)}
            loading={receipts.loading}
          >
            Check receipts
          </Button>
        </div>
      ) : null}
      {receiptResult ? <ReasonList reasons={receiptResult.reasons} /> : null}
      {receipts.error ? <Notice tone="error">{receipts.error}</Notice> : null}
    </section>
  );
}
