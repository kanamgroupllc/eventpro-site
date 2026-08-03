import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { theme as staticTheme } from "../theme";

/**
 * Shown after sign-up or when user opens the verify-email link.
 * Backend email verification flow can be wired when available.
 */
export function VerifyScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "20" }]}>
          <Ionicons name="mail-open-outline" size={40} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>Verify your email</Text>
        <Text style={[styles.desc, { color: theme.colors.mutedForeground }]}>
          Please check your email for a verification link to complete your registration.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.replace("Login")}
        >
          <Text style={[styles.primaryBtnText, { color: theme.colors.primaryForeground }]}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: staticTheme.spacing.lg, justifyContent: "center" },
  card: { padding: staticTheme.spacing.xl, borderRadius: staticTheme.radius.lg, borderWidth: 1, alignItems: "center" },
  iconWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 12,
    textAlign: "center",
    fontFamily: staticTheme.fontFamily.heading,
  },
  desc: { fontSize: 15, textAlign: "center", marginBottom: 24, paddingHorizontal: 8 },
  primaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    shadowColor: "#5d3fd3",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "800" },
});
