export interface AppRoute {
  readonly path: string;
  readonly label: string;
}

// Mirrors PUSH_ROUTES in features/notifications/model/NotificationOpenTarget.ts; the app ignores any other path.
export const APP_ROUTES: readonly AppRoute[] = [
  { path: "/(tabs)", label: "Home" },
  { path: "/milestones", label: "Milestones" },
  { path: "/create", label: "Create" },
  { path: "/memories", label: "Memories" },
  { path: "/settings", label: "Settings" },
  { path: "/couple-calendar", label: "Couple calendar" },
  { path: "/share-templates", label: "Share templates" },
  { path: "/saved-cards", label: "Saved cards" },
  { path: "/paywall", label: "Premium" },
  { path: "/moments/new", label: "New moment" },
  { path: "/settings/support", label: "Help & support" },
  { path: "/settings/rate", label: "Rate the app" },
];

export function isKnownRoute(path: string): boolean {
  return APP_ROUTES.some((route) => route.path === path);
}

export function routeLabel(path: string | null): string | null {
  if (!path) return null;
  return APP_ROUTES.find((route) => route.path === path)?.label ?? path;
}
