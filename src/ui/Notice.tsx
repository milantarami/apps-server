import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon.tsx";
import styles from "./Notice.module.css";

type NoticeTone = "error" | "warn" | "success" | "info";

const TONE_ICONS: Record<NoticeTone, IconName> = {
  error: "alert",
  warn: "alert",
  success: "check",
  info: "bell",
};

interface NoticeProps {
  readonly tone: NoticeTone;
  readonly title?: string;
  readonly children?: ReactNode;
}

export function Notice({ tone, title, children }: NoticeProps) {
  return (
    <div className={`${styles.notice} ${styles[tone]}`} role={tone === "error" ? "alert" : "status"}>
      <Icon name={TONE_ICONS[tone]} className={styles.icon} />
      <div>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
    </div>
  );
}
