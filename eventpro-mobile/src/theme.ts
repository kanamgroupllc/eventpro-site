/**
 * Mobile theme — Kanam Events Ink & Signal (aligned with web index.css).
 * Ink:    #0A0A0A
 * Paper:  #F7F7F5
 * Signal: #0A66F0  (hsl 214 95% 48%)
 */

const shared = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    full: 9999,
  },
  /** Optional: set when loading web fonts (Plus Jakarta Sans, Syne) via expo-font for full parity. */
  fontFamily: {
    sans: undefined as string | undefined,
    heading: undefined as string | undefined,
  },
  typography: {
    title: { fontSize: 24, fontWeight: "700" as const },
    heading: { fontSize: 20, fontWeight: "600" as const },
    body: { fontSize: 16 },
    caption: { fontSize: 14 },
    label: { fontSize: 14, fontWeight: "600" as const },
  },
};

export const lightColors = {
  primary: "#0A66F0",
  primaryGlow: "#4D93F5",
  primaryForeground: "#ffffff",
  background: "#F7F7F5",
  foreground: "#0A0A0A",
  card: "#ffffff",
  cardForeground: "#0A0A0A",
  muted: "#F0F0EC",
  mutedForeground: "#5C6470",
  border: "#DEE2E8",
  input: "#DEE2E8",
  destructive: "#EF4444",
  destructiveForeground: "#ffffff",
  success: "#22c55e",
  warning: "#eab308",
  accent: "#E8F1FE",
  accentForeground: "#084BB3",
};

export const darkColors = {
  primary: "#3B82F6",
  primaryGlow: "#60A5FA",
  primaryForeground: "#ffffff",
  background: "#101318",
  foreground: "#F4F4F2",
  card: "#171A1F",
  cardForeground: "#F4F4F2",
  muted: "#252A33",
  mutedForeground: "#9AA3B0",
  border: "#2E3540",
  input: "#2E3540",
  destructive: "#f87171",
  destructiveForeground: "#ffffff",
  success: "#4ade80",
  warning: "#facc15",
  accent: "#1A2A44",
  accentForeground: "#93C5FD",
};

export const lightTheme = { ...shared, colors: lightColors };
export const darkTheme = { ...shared, colors: darkColors };

export type Theme = typeof lightTheme;

/** Default export for backward compat; prefer useTheme() from ThemeContext for light/dark. */
export const theme = lightTheme;
