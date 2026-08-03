import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";

/**
 * Reset password with token (e.g. from email link).
 * When backend adds POST /auth/reset-password or similar, wire it here.
 */
function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: theme.spacing.lg, paddingVertical: 40 },
    card: {
      padding: theme.spacing.xl,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      shadowColor: "#36274e",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 4,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
      alignSelf: "center",
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginBottom: 8,
      textAlign: "center",
      color: theme.colors.foreground,
      fontFamily: theme.fontFamily.heading,
    },
    desc: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22, color: theme.colors.mutedForeground },
    input: {
      borderWidth: 1,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      marginBottom: 12,
    },
    error: { marginBottom: 12, fontSize: 14 },
    primaryBtn: {
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 9999,
      alignItems: "center",
      marginBottom: 16,
      shadowColor: "#5d3fd3",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 6,
    },
    btnDisabled: { opacity: 0.7 },
    primaryBtnText: { fontSize: 16, fontWeight: "800" },
    link: { alignItems: "center" },
    linkText: { fontSize: 15 },
  });
}

export function ResetPasswordScreen({ navigation, route }: { navigation: any; route?: { params?: { token?: string } } }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const token = route?.params?.token;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      await new Promise((r) => setTimeout(r, 800));
      Alert.alert(
        "Not yet available",
        "Password reset will be available when the backend API is connected. Use the web app or contact support.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={60}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "20" }]}>
            <Ionicons name="key-outline" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.desc}>
            {token
              ? "Enter your new password below."
              : "Password reset from email uses a secure token. Open the link from your email, or use forgot password to request a new one."}
          </Text>
          {token ? (
            <>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.foreground },
                ]}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setError(null);
                }}
                placeholder="New password"
                placeholderTextColor={theme.colors.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.foreground },
                ]}
                value={confirm}
                onChangeText={(t) => {
                  setConfirm(t);
                  setError(null);
                }}
                placeholder="Confirm password"
                placeholderTextColor={theme.colors.mutedForeground}
                secureTextEntry
                autoCapitalize="none"
              />
              {error ? <Text style={[styles.error, { color: theme.colors.destructive }]}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: theme.colors.primaryForeground }]}>Reset password</Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity style={styles.link} onPress={() => navigation.replace("Login")}>
            <Text style={[styles.linkText, { color: theme.colors.mutedForeground }]}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
