import styles from "./SendBar.module.css";
import { Icon } from "../../../ui/Icon.tsx";
import { Button } from "../../../ui/Button.tsx";
import { formatCount } from "../../../ui/format.ts";
import type { AudienceCount } from "../useAudienceCount.ts";
import { audienceLabel, type AudienceChoice } from "../service/composeDraft.ts";

interface SendBarProps {
  readonly projectName: string | null;
  readonly audienceChoice: AudienceChoice;
  readonly audience: AudienceCount;
  readonly sending: boolean;
  readonly onSend: () => void;
  readonly onClear: () => void;
}

function describe(choice: AudienceChoice, audience: AudienceCount): string {
  if (audience.error) return audience.error;
  if (choice === "token") {
    if (audience.count === null) return "Paste a token to target one device.";
    return audience.count > 0 ? "Registered device. Sends to this token only." : "Not in Supabase yet; sends anyway.";
  }
  if (audience.count === null) return "Counting devices…";
  return `${audience.count === 1 ? "device" : "devices"} with push on · plus ${audienceLabel(choice)}`;
}

export function SendBar({ projectName, audienceChoice, audience, sending, onSend, onClear }: SendBarProps) {
  const isBroadcast = audienceChoice !== "token";
  const count = isBroadcast ? audience.count : audience.count === null ? null : 1;
  const blocked = isBroadcast && audience.count === null;
  const sendLabel = isBroadcast ? "Send to everyone" : "Send test";

  return (
    <div className={styles.bar}>
      <div className={styles.count} aria-live="polite">
        <span className={styles.number}>{audience.loading || count === null ? "—" : formatCount(count)}</span>
        <span className={styles.label}>
          {projectName ? <strong>{projectName} · </strong> : null}
          {describe(audienceChoice, audience)}
        </span>
      </div>
      <div className={styles.actions}>
        <Button variant="quiet" onClick={onClear} disabled={sending}>
          Clear
        </Button>
        <Button variant="primary" size="large" onClick={onSend} loading={sending} disabled={blocked}>
          {sending ? "Sending…" : sendLabel}
          {sending ? null : <Icon name="send" size={16} />}
        </Button>
      </div>
    </div>
  );
}
