const PATHS = {
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  check: "M20 6 9 17l-5-5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0",
  arrow: "M5 12h14M13 5l7 7-7 7",
  sound: "M11 5 6 9H2v6h4l5 4V5M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14",
  mute: "M11 5 6 9H2v6h4l5 4V5M22 9l-6 6M16 9l6 6",
  refresh: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  lock: "M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z",
  send: "m22 2-7 20-4-9-9-4 20-7M22 2 11 13",
  route: "M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 16h4a3 3 0 0 0 3-3v-2",
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly className?: string;
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
