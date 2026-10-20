import { IosPreview } from "./IosPreview.tsx";
import styles from "./Preview.module.css";
import { Icon } from "../../../ui/Icon.tsx";
import { AndroidPreview } from "./AndroidPreview.tsx";
import type { PreviewModel } from "../service/composeDraft.ts";

interface PreviewPanelProps {
  readonly appName: string;
  readonly preview: PreviewModel;
  readonly bytes: number;
}

export function PreviewPanel({ appName, preview, bytes }: PreviewPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="preview-heading">
      <div className={styles.head}>
        <h2 className={styles.title} id="preview-heading">
          How it lands
        </h2>
        <span className={styles.eyebrow}>Live proof</span>
      </div>
      <div className={styles.wall}>
        <span className={styles.clock} aria-hidden="true">
          9:41
        </span>
        <AndroidPreview appName={appName} preview={preview} />
        <IosPreview appName={appName} preview={preview} />
      </div>
      <dl className={styles.meta}>
        <dt>On tap</dt>
        <dd>
          <Icon name="route" size={16} />
          {preview.routeLabel ? `Opens ${preview.routeLabel}` : "Opens the app"}
        </dd>
        <dt>Android channel</dt>
        <dd>{preview.channelLabel}</dd>
        <dt>Sound</dt>
        <dd>
          <Icon name={preview.sound ? "sound" : "mute"} size={16} />
          {preview.sound ? "On" : "Silent"}
        </dd>
        <dt>Payload</dt>
        <dd>{bytes} bytes</dd>
      </dl>
      <p className={styles.note}>
        Approximate. Real rendering depends on OS version, device and text size. While the app is open, it shows a
        banner without sound.
      </p>
    </section>
  );
}
