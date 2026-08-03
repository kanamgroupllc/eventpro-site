import React from "react";
import { Image, ImageStyle, StyleProp, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const logoLight = require("../../assets/kanam-events-logo-light.png");
const logoDark = require("../../assets/kanam-events-logo-dark.png");

type BrandLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** Theme-aware Kanam Events wordmark (transparent PNG). */
export function BrandLogo({ size = 96, style }: BrandLogoProps) {
  const { isDark } = useTheme();

  return (
    <Image
      source={isDark ? logoDark : logoLight}
      accessibilityLabel="Kanam Events"
      style={[styles.logo, { width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    backgroundColor: "transparent",
  },
});
