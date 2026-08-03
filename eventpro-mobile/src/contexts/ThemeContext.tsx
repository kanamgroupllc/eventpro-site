import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import * as SecureStore from "expo-secure-store";
import { darkTheme, lightTheme } from "../theme";
import type { Theme } from "../theme";

const THEME_KEY = "eventpro_color_scheme";

type ColorScheme = "light" | "dark";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => Promise<void>;
  theme: Theme;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("light");

  useEffect(() => {
    SecureStore.getItemAsync(THEME_KEY).then((stored) => {
      let scheme: ColorScheme = stored === "dark" || stored === "light" ? stored : "light";
      if (stored !== "dark" && stored !== "light") {
        const system = Appearance.getColorScheme();
        if (system === "dark" || system === "light") scheme = system;
      }
      setColorSchemeState(scheme);
      if (typeof Appearance.setColorScheme === "function") {
        Appearance.setColorScheme(scheme);
      }
    });
  }, []);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    await SecureStore.setItemAsync(THEME_KEY, scheme);
    setColorSchemeState(scheme);
    if (typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme(scheme);
    }
  }, []);

  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const value: ThemeContextValue = {
    colorScheme,
    setColorScheme,
    theme,
    isDark: colorScheme === "dark",
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
