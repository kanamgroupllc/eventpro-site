import type { Theme } from "../theme";

/** Stitch-aligned card: tonal lift, no harsh border emphasis */
export function editorialCard(theme: Theme) {
  return {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
    shadowColor: "#36274e",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 22,
    elevation: 3,
  };
}

export function pageTitle(theme: Theme) {
  return {
    fontSize: 26,
    fontWeight: "800" as const,
    letterSpacing: -0.35,
    color: theme.colors.foreground,
    fontFamily: theme.fontFamily.heading,
  };
}

export function sectionLabel(theme: Theme) {
  return {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    color: theme.colors.mutedForeground,
    marginBottom: 8,
  };
}
