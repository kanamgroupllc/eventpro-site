import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { BrandLogo } from "../components/BrandLogo";
import type { Theme } from "../theme";

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: theme.spacing.lg, paddingVertical: 40 },
    brandRow: { alignItems: "center", justifyContent: "center", marginBottom: 28 },
    brandName: {
      fontSize: 18,
      fontWeight: "800",
      color: theme.colors.foreground,
      fontFamily: theme.fontFamily.heading,
      marginTop: 4,
      letterSpacing: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: -0.3,
      textAlign: "center",
      marginBottom: 8,
      color: theme.colors.foreground,
      fontFamily: theme.fontFamily.heading,
    },
    subtitle: { fontSize: 15, color: theme.colors.mutedForeground, textAlign: "center", marginBottom: 28 },
    input: {
      borderWidth: 0,
      borderRadius: 14,
      padding: 16,
      fontSize: 16,
      marginBottom: 14,
      backgroundColor: `${theme.colors.primary}14`,
      color: theme.colors.foreground,
    },
    passwordRow: { position: "relative" as const, marginBottom: 8 },
    passwordInput: { marginBottom: 0, paddingRight: 48 },
    eyeButton: { position: "absolute" as const, right: 12, top: 0, bottom: 0, justifyContent: "center" },
    forgotLink: { alignSelf: "flex-end", marginBottom: 16 },
    forgotText: { fontSize: 14, color: theme.colors.primary, fontWeight: "600" },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.full,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: theme.colors.primaryForeground, fontSize: 16, fontWeight: "800" },
    orRow: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 12 },
    orLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    orText: { fontSize: 11, fontWeight: "700", color: theme.colors.mutedForeground, letterSpacing: 1.2 },
    socialRow: { flexDirection: "row", gap: 12 },
    socialBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    socialText: { fontSize: 15, fontWeight: "600", color: theme.colors.foreground },
    footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28, flexWrap: "wrap" },
    footerText: { fontSize: 14, color: theme.colors.mutedForeground },
    footerLink: { fontSize: 14, color: theme.colors.primary, fontWeight: "800" },
    verifyLink: { alignSelf: "center", marginTop: 16 },
    verifyText: { fontSize: 14, color: theme.colors.primary, fontWeight: "600" },
  });
}

export function LoginScreen({ navigation }: { navigation: { navigate: (name: string) => void } }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Enter email and password");
      return;
    }
    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      const parent = (navigation as { getParent?: () => { navigate: (n: string) => void } }).getParent;
      parent?.().navigate("Main");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; response?: { data?: { message?: string } }; isAxiosError?: boolean };
      const isNetworkError =
        e?.code === "ERR_NETWORK" ||
        e?.code === "ECONNRESET" ||
        e?.message === "Network Error" ||
        (e?.isAxiosError && !e?.response);
      const description = isNetworkError
        ? "Cannot reach the server. On a physical device, set EXPO_PUBLIC_API_URL in eventpro-mobile/.env to your computer's IP (e.g. http://192.168.1.x:8080), then restart Expo. On simulator, use http://localhost:8080."
        : e?.response?.data?.message ?? e?.message ?? "Invalid credentials. Check your email and password.";
      Alert.alert("Login failed", description);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <BrandLogo size={112} />
          <Text style={styles.brandName}>KANAM EVENTS</Text>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Access your curated event dashboard</Text>

        <TextInput
          style={styles.input}
          placeholder="Email Address"
          placeholderTextColor="#8b8b9a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />

        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor="#8b8b9a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#8b8b9a" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotLink} onPress={() => navigation.navigate("ForgotPassword")}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={theme.colors.primaryForeground} />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR CONTINUE WITH</Text>
          <View style={styles.orLine} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert("Google", "Social sign-in is not wired yet.")}>
            <Text style={[styles.socialText, { fontSize: 18, fontWeight: "600" }]}>G</Text>
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtn} onPress={() => Alert.alert("Apple", "Social sign-in is not wired yet.")}>
            <Ionicons name="logo-apple" size={22} color={theme.colors.foreground} />
            <Text style={styles.socialText}>Apple</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.verifyLink} onPress={() => navigation.navigate("Verify")}>
          <Text style={styles.verifyText}>Verify your email</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
