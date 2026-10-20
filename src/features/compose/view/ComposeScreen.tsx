import type { CSSProperties } from "react";
import { SendBar } from "./SendBar.tsx";
import styles from "./Compose.module.css";
import { useCompose } from "../useCompose.ts";
import { PreviewPanel } from "./PreviewPanel.tsx";
import { Notice } from "../../../ui/Notice.tsx";
import { MessageSection } from "./MessageSection.tsx";
import { AudienceSection } from "./AudienceSection.tsx";
import { DeliverySection } from "./DeliverySection.tsx";
import { SendResultPanel } from "./SendResultPanel.tsx";
import { TapActionSection } from "./TapActionSection.tsx";
import { ConfirmSendDialog } from "./ConfirmSendDialog.tsx";

interface ComposeScreenProps {
  readonly project: string;
  readonly appName: string;
  readonly projectName: string | null;
  readonly prefillToken: string | null;
}

function order(index: number): CSSProperties {
  return { "--order": index } as CSSProperties;
}

export function ComposeScreen({ project, appName, projectName, prefillToken }: ComposeScreenProps) {
  const compose = useCompose(project, prefillToken);
  const { draft, update, errors } = compose;

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.formColumn}>
          <header className={`${styles.intro} ${styles.reveal}`} style={order(0)}>
            <h2 className={styles.headline}>
              Write something <em>worth</em> opening.
            </h2>
            <p className={styles.lede}>
              Sends through Expo Push to Firebase Cloud Messaging and Apple. Start with one device, then go wide.
            </p>
          </header>
          <div className={styles.reveal} style={order(1)}>
            <MessageSection draft={draft} errors={errors} onChange={update} />
          </div>
          <div className={styles.reveal} style={order(2)}>
            <TapActionSection draft={draft} errors={errors} bytes={compose.bytes} onChange={update} />
          </div>
          <div className={styles.reveal} style={order(3)}>
            <DeliverySection draft={draft} onChange={update} />
          </div>
          <div className={styles.reveal} style={order(4)}>
            <AudienceSection draft={draft} errors={errors} onChange={update} />
          </div>
          {compose.sendError ? (
            <Notice tone="error" title="Nothing was sent">
              {compose.sendError}
            </Notice>
          ) : null}
          {compose.result ? (
            <SendResultPanel
              result={compose.result}
              receipts={compose.receipts}
              onCheckReceipts={compose.checkReceipts}
            />
          ) : null}
          <SendBar
            projectName={projectName}
            audienceChoice={draft.audience}
            audience={compose.audience}
            sending={compose.phase === "sending"}
            onSend={compose.requestSend}
            onClear={compose.reset}
          />
        </div>
        <aside className={`${styles.aside} ${styles.reveal}`} style={order(2)}>
          <PreviewPanel appName={appName} preview={compose.preview} bytes={compose.bytes} />
        </aside>
      </div>
      <ConfirmSendDialog
        open={compose.phase === "confirming"}
        projectName={projectName}
        count={compose.audience.count}
        audience={draft.audience}
        preview={compose.preview}
        onConfirm={compose.confirmSend}
        onCancel={compose.cancelSend}
      />
    </main>
  );
}
