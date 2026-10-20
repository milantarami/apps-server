const numberFormat = new Intl.NumberFormat("en-US");
const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const relativeFormat = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function formatRelative(iso: string, now: number = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relativeFormat.format(seconds, "second");
  if (abs < 3600) return relativeFormat.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormat.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 45) return relativeFormat.format(Math.round(seconds / 86_400), "day");
  return relativeFormat.format(Math.round(seconds / (86_400 * 30)), "month");
}
