import styles from "./Compose.module.css";
import form from "../../../ui/Form.module.css";
import { FieldError } from "../../../ui/FieldError.tsx";
import { SectionHeading } from "../../../ui/SectionHeading.tsx";
import type { ComposeDraft } from "../service/composeDraft.ts";
import { BODY_MAX, TITLE_MAX, type FieldErrors } from "../../../../shared/compose.ts";

interface MessageSectionProps {
  readonly draft: ComposeDraft;
  readonly errors: FieldErrors;
  readonly onChange: (patch: Partial<ComposeDraft>) => void;
}

export function MessageSection({ draft, errors, onChange }: MessageSectionProps) {
  const titleLength = draft.title.trim().length;
  const bodyLength = draft.body.trim().length;
  return (
    <section className={styles.section} aria-labelledby="message-heading">
      <SectionHeading
        number="01"
        id="message-heading"
        title="Message"
        hint="Short beats clever. The lock screen shows roughly 40 title characters and two lines of body."
      />
      <div className={styles.fields}>
        <div className={form.field}>
          <div className={form.labelRow}>
            <label className={form.label} htmlFor="push-title">
              Title
            </label>
            <span className={`${form.counter} ${titleLength > TITLE_MAX ? form.counterOver : ""}`}>
              {titleLength}/{TITLE_MAX}
            </span>
          </div>
          <input
            id="push-title"
            className={`${form.control} ${errors.title ? form.invalid : ""}`}
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Happy Valentine’s week"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "push-title-error" : undefined}
          />
          <FieldError id="push-title-error" message={errors.title} />
        </div>
        <div className={form.field}>
          <div className={form.labelRow}>
            <label className={form.label} htmlFor="push-body">
              Body
            </label>
            <span className={`${form.counter} ${bodyLength > BODY_MAX ? form.counterOver : ""}`}>
              {bodyLength}/{BODY_MAX}
            </span>
          </div>
          <textarea
            id="push-body"
            className={`${form.control} ${form.textarea} ${errors.body ? form.invalid : ""}`}
            value={draft.body}
            onChange={(event) => onChange({ body: event.target.value })}
            placeholder="Make a card for the two of you. New templates are waiting."
            aria-invalid={errors.body ? true : undefined}
            aria-describedby={errors.body ? "push-body-error" : undefined}
          />
          <FieldError id="push-body-error" message={errors.body} />
        </div>
      </div>
    </section>
  );
}
