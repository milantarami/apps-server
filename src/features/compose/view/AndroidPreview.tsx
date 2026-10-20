import styles from "./Preview.module.css";
import type { PreviewModel } from "../service/composeDraft.ts";

interface AndroidPreviewProps {
  readonly appName: string;
  readonly preview: PreviewModel;
}

export function AndroidPreview({ appName, preview }: AndroidPreviewProps) {
  return (
    <div className={styles.platform}>
      <span className={styles.platformLabel}>Android</span>
      <div className={`${styles.android} ${preview.isPlaceholder ? styles.placeholder : ""}`}>
        <div className={styles.androidMeta}>
          <span className={styles.androidIcon} aria-hidden="true">
            {appName.charAt(0).toUpperCase()}
          </span>
          <span>{appName} · now</span>
        </div>
        <p className={styles.notifTitle}>{preview.title}</p>
        <p className={styles.notifBody}>{preview.body}</p>
      </div>
    </div>
  );
}
