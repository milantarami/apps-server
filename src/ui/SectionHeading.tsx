import styles from "./SectionHeading.module.css";

interface SectionHeadingProps {
  readonly number: string;
  readonly title: string;
  readonly hint?: string;
  readonly id?: string;
}

export function SectionHeading({ number, title, hint, id }: SectionHeadingProps) {
  return (
    <div className={styles.heading}>
      <span className={styles.number} aria-hidden="true">
        {number}
      </span>
      <h2 className={styles.title} id={id}>
        {title}
      </h2>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  );
}
