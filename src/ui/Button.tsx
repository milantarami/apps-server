import type { ReactNode } from "react";
import styles from "./Button.module.css";

interface ButtonProps {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "secondary" | "quiet" | "danger";
  readonly size?: "md" | "large";
  readonly type?: "button" | "submit";
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly ariaLabel?: string;
  readonly autoFocus?: boolean;
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  type = "button",
  disabled = false,
  loading = false,
  ariaLabel,
  autoFocus,
}: ButtonProps) {
  const className = [styles.button, styles[variant], size === "large" ? styles.large : ""].filter(Boolean).join(" ");
  return (
    <button
      type={type}
      className={className}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
