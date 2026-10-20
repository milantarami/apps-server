import styles from "./Preview.module.css";
import type { PreviewModel } from "../service/composeDraft.ts";

interface IosPreviewProps {
  readonly appName: string;
  readonly preview: PreviewModel;
}

export function IosPreview({ appName, preview }: IosPreviewProps) {
  return (
    <div className={styles.platform}>
      <span className={styles.platformLabel}>iOS</span>
      <div className={`${styles.ios} ${preview.isPlaceholder ? styles.placeholder : ""}`}>
        <span className={styles.iosIcon} aria-hidden="true">
          {appName.charAt(0).toUpperCase()}
        </span>
        <div>
          <div className={styles.iosHeader}>
            <p className={styles.notifTitle}>{preview.title}</p>
            <span className={styles.iosTime}>now</span>
          </div>
          <p className={`${styles.notifBody} ${styles.iosBody}`}>{preview.body}</p>
        </div>
      </div>
    </div>
  );
}
