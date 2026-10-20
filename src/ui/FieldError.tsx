import { Icon } from "./Icon.tsx";
import styles from "./Form.module.css";

interface FieldErrorProps {
  readonly id: string;
  readonly message: string | undefined;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={id} className={styles.error}>
      <Icon name="alert" size={14} />
      {message}
    </p>
  );
}
