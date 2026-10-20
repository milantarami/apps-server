import type { CSSProperties } from "react";
import styles from "./Compose.module.css";
import form from "../../../ui/Form.module.css";
import { FieldError } from "../../../ui/FieldError.tsx";
import { APP_ROUTES } from "../../../../shared/routes.ts";
import { SectionHeading } from "../../../ui/SectionHeading.tsx";
import type { ComposeDraft } from "../service/composeDraft.ts";
import { PAYLOAD_BUDGET_BYTES, type FieldErrors } from "../../../../shared/compose.ts";

interface TapActionSectionProps {
  readonly draft: ComposeDraft;
  readonly errors: FieldErrors;
  readonly bytes: number;
  readonly onChange: (patch: Partial<ComposeDraft>) => void;
}

export function TapActionSection({ draft, errors, bytes, onChange }: TapActionSectionProps) {
  const fill = Math.min(bytes / PAYLOAD_BUDGET_BYTES, 1);
  const over = bytes > PAYLOAD_BUDGET_BYTES;
  return (
    <section className={styles.section} aria-labelledby="tap-heading">
      <SectionHeading
        number="02"
        id="tap-heading"
        title="On tap"
        hint="Pick the screen that opens. The app only follows routes on this list; anything else just opens the app."
      />
      <div className={styles.fields}>
        <div className={form.field}>
          <label className={form.label} htmlFor="push-route">
            Open screen <span className={form.optional}>(optional)</span>
          </label>
          <select
            id="push-route"
            className={`${form.control} ${form.select} ${errors.route ? form.invalid : ""}`}
            value={draft.route}
            onChange={(event) => onChange({ route: event.target.value })}
          >
            <option value="">Just open the app</option>
            {APP_ROUTES.map((route) => (
              <option key={route.path} value={route.path}>
                {route.label} · {route.path}
              </option>
            ))}
          </select>
          <FieldError id="push-route-error" message={errors.route} />
        </div>
        <div className={form.field}>
          <label className={form.label} htmlFor="push-data">
            Custom data <span className={form.optional}>(optional JSON object)</span>
          </label>
          <textarea
            id="push-data"
            className={`${form.control} ${form.textarea} ${form.mono} ${errors.data ? form.invalid : ""}`}
            value={draft.dataText}
            onChange={(event) => onChange({ dataText: event.target.value })}
            placeholder={'{ "campaign": "valentines-2027" }'}
            spellCheck={false}
            aria-invalid={errors.data ? true : undefined}
            aria-describedby="push-data-hint push-data-error"
          />
          <FieldError id="push-data-error" message={errors.data} />
          <div
            id="push-data-hint"
            className={`${styles.bytes} ${over ? styles.meterOver : ""}`}
            style={{ "--fill": fill } as CSSProperties}
          >
            <span>
              {bytes} / {PAYLOAD_BUDGET_BYTES} bytes
            </span>
            <span className={styles.meter} aria-hidden="true">
              <span className={styles.meterFill} />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
