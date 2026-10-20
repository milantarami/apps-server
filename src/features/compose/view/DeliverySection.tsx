import styles from "./Compose.module.css";
import form from "../../../ui/Form.module.css";
import { FieldError } from "../../../ui/FieldError.tsx";
import { SectionHeading } from "../../../ui/SectionHeading.tsx";
import type { ComposeDraft } from "../service/composeDraft.ts";
import { ANDROID_CHANNELS, type FieldErrors } from "../../../../shared/compose.ts";

interface DeliverySectionProps {
  readonly draft: ComposeDraft;
  readonly errors: FieldErrors;
  readonly expiryLimits: { readonly min: string; readonly max: string };
  readonly onChange: (patch: Partial<ComposeDraft>) => void;
}

export function DeliverySection({ draft, errors, expiryLimits, onChange }: DeliverySectionProps) {
  return (
    <section className={styles.section} aria-labelledby="delivery-heading">
      <SectionHeading
        number="03"
        id="delivery-heading"
        title="Delivery"
        hint="Android files every notification under a channel the user can mute separately."
      />
      <div className={styles.fields}>
        <fieldset className={styles.choiceGrid}>
          <legend className={`${form.label} visually-hidden`}>Android channel</legend>
          {ANDROID_CHANNELS.map((channel) => (
            <label key={channel.id} className={styles.choice}>
              <input
                className={styles.choiceInput}
                type="radio"
                name="channel"
                value={channel.id}
                checked={draft.channelId === channel.id}
                onChange={() => onChange({ channelId: channel.id })}
              />
              <span className={styles.choiceTitle}>
                {channel.label}
                <span className={styles.choiceMark} aria-hidden="true" />
              </span>
              <span className={styles.choiceHint}>{channel.hint}</span>
            </label>
          ))}
        </fieldset>
        <label className={styles.switchRow}>
          <span className={styles.switchText}>
            <span className={form.label}>Play a sound</span>
            <span className={form.hint}>
              Uses the device's default sound when the app is in the background. Android channels can override it.
            </span>
          </span>
          <input
            className={styles.switchInput}
            type="checkbox"
            role="switch"
            checked={draft.sound}
            onChange={(event) => onChange({ sound: event.target.checked })}
          />
          <span className={styles.switchTrack} aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
        </label>
        <div className={form.field}>
          <label className={form.label} htmlFor="push-expires">
            Expires
          </label>
          <input
            id="push-expires"
            type="datetime-local"
            className={`${form.control} ${errors.expiresAt ? form.invalid : ""}`}
            value={draft.expiresAt}
            min={expiryLimits.min}
            max={expiryLimits.max}
            onChange={(event) => onChange({ expiresAt: event.target.value })}
            aria-invalid={errors.expiresAt ? true : undefined}
            aria-describedby="push-expires-hint push-expires-error"
          />
          <FieldError id="push-expires-error" message={errors.expiresAt} />
          <p id="push-expires-hint" className={form.hint}>
            Your local time. After this the app marks it read and stops picking it up. Defaults to 7 days, up to 30.
          </p>
        </div>
      </div>
    </section>
  );
}
