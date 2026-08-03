/**
 * Shared style helpers using theme – use for consistent colors and typography across all screens.
 */
import { theme } from "./theme";

export const t = theme;

/** Common screen container using theme background */
export const screenContainer = { flex: 1, backgroundColor: theme.colors.background } as const;

/** Primary button style (web-matching violet) */
export const primaryButton = {
  backgroundColor: theme.colors.primary,
  borderRadius: theme.radius.md,
  padding: theme.spacing.md,
  alignItems: "center" as const,
};

/** Card surface */
export const cardSurface = {
  backgroundColor: theme.colors.card,
  borderRadius: theme.radius.lg,
  borderWidth: 1,
  borderColor: theme.colors.border,
};
