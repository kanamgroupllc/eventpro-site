import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from "react-native";
import { BrandLogo } from "../components/BrandLogo";
import { useTheme } from "../contexts/ThemeContext";

const { width: W } = Dimensions.get("window");

/**
 * Splash: Kanam Events wordmark + Ink & Signal initializing bar.
 */
export function SplashScreen() {
  const { theme } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [progress]);

  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, Math.min(W - 80, 320)],
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.center}>
        <BrandLogo size={160} style={styles.logo} />
        <Text style={[styles.tag, { color: theme.colors.mutedForeground }]}>
          <Text style={{ fontWeight: "600" }}>Curating </Text>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Live Moments</Text>
        </Text>
      </View>

      <View style={styles.bottom}>
        <View style={[styles.track, { backgroundColor: `${theme.colors.primary}22` }]}>
          <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: theme.colors.primary }]} />
        </View>
        <Text style={[styles.init, { color: theme.colors.mutedForeground }]}>INITIALIZING EXPERIENCE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  logo: { marginBottom: 16 },
  tag: { fontSize: 16, textAlign: "center" },
  bottom: { paddingBottom: 48, paddingHorizontal: 32, alignItems: "center" },
  track: {
    width: "100%",
    maxWidth: 320,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  init: { fontSize: 10, fontWeight: "800", letterSpacing: 3 },
});
