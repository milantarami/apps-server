import { useEffect, useRef } from "react";
import { Button } from "../../../ui/Button.tsx";
import styles from "./ConfirmDialog.module.css";
import { formatCount } from "../../../ui/format.ts";
import { audienceLabel, type AudienceChoice, type PreviewModel } from "../service/composeDraft.ts";

interface ConfirmSendDialogProps {
  readonly open: boolean;
  readonly projectName: string | null;
  readonly count: number | null;
  readonly audience: AudienceChoice;
  readonly preview: PreviewModel;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmSendDialog({
  open,
  projectName,
  count,
  audience,
  preview,
  onConfirm,
  onCancel,
}: ConfirmSendDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onCancel} aria-labelledby="confirm-heading">
      <div className={styles.body}>
        <p className={styles.eyebrow} id="confirm-heading">
          Confirm broadcast{projectName ? ` · ${projectName}` : ""}
        </p>
        <div className={styles.figure}>
          <span className={styles.number}>{count === null ? "?" : formatCount(count)}</span>
          <span className={styles.caption}>
            {count === 1 ? "device" : "devices"} · {audienceLabel(audience)}, right now.
          </span>
        </div>
        <blockquote className={styles.quote}>
          <span className={styles.quoteTitle}>{preview.title}</span>
          <span>{preview.body}</span>
        </blockquote>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Send to {count === null ? "all" : formatCount(count)}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
