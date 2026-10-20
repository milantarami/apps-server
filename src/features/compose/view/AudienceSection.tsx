import styles from "./Compose.module.css";
import form from "../../../ui/Form.module.css";
import { FieldError } from "../../../ui/FieldError.tsx";
import type { FieldErrors } from "../../../../shared/compose.ts";
import { SectionHeading } from "../../../ui/SectionHeading.tsx";
import type { AudienceChoice, ComposeDraft } from "../service/composeDraft.ts";

const CHOICES: readonly { readonly value: AudienceChoice; readonly title: string; readonly hint: string }[] = [
  { value: "token", title: "One device", hint: "Paste a token to test on your own phone first." },
  { value: "android", title: "Android", hint: "Every enabled Android device." },
  { value: "ios", title: "iOS", hint: "Every enabled iPhone and iPad." },
  { value: "all", title: "Everyone", hint: "Every enabled device. Asks to confirm." },
];

interface AudienceSectionProps {
  readonly draft: ComposeDraft;
  readonly errors: FieldErrors;
  readonly onChange: (patch: Partial<ComposeDraft>) => void;
}

export function AudienceSection({ draft, errors, onChange }: AudienceSectionProps) {
  return (
    <section className={styles.section} aria-labelledby="audience-heading">
      <SectionHeading
        number="04"
        id="audience-heading"
        title="Audience"
        hint="Only devices with notifications switched on in the app are counted."
      />
      <div className={styles.fields}>
        <fieldset className={styles.choiceGrid}>
          <legend className="visually-hidden">Who receives this</legend>
          {CHOICES.map((choice) => (
            <label key={choice.value} className={styles.choice}>
              <input
                className={styles.choiceInput}
                type="radio"
                name="audience"
                value={choice.value}
                checked={draft.audience === choice.value}
                onChange={() => onChange({ audience: choice.value })}
              />
              <span className={styles.choiceTitle}>
                {choice.title}
                <span className={styles.choiceMark} aria-hidden="true" />
              </span>
              <span className={styles.choiceHint}>{choice.hint}</span>
            </label>
          ))}
        </fieldset>
        {draft.audience === "token" ? (
          <div className={form.field}>
            <label className={form.label} htmlFor="push-token">
              Expo push token
            </label>
            <input
              id="push-token"
              className={`${form.control} ${form.mono} ${errors.token ? form.invalid : ""}`}
              value={draft.token}
              onChange={(event) => onChange({ token: event.target.value })}
              placeholder="ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={errors.token ? true : undefined}
              aria-describedby="push-token-hint push-token-error"
            />
            <FieldError id="push-token-error" message={errors.token} />
            <p id="push-token-hint" className={form.hint}>
              Find yours under Devices (newest first after you open the app), then use “Test”.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
