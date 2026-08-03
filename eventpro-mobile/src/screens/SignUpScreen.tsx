import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { BrandLogo } from "../components/BrandLogo";
import type { Theme } from "../theme";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

/** Extract a user-friendly message from signup API error (backend sends message + optional fields). */
function getSignUpErrorMessage(err: unknown): string {
  const e = err as {
    response?: {
      status?: number;
      statusText?: string;
      data?: {
        message?: string;
        fields?: Record<string, string>;
        detail?: string;
      };
    };
    message?: string;
  };
  const data = e?.response?.data;
  const isNetworkError =
    !e?.response &&
    (e?.message === "Network Error" ||
      (err as { code?: string })?.code === "ERR_NETWORK" ||
      (err as { code?: string })?.code === "ECONNRESET");
  if (isNetworkError) {
    return "Cannot reach the server. On a physical device, set EXPO_PUBLIC_API_URL in eventpro-mobile/.env to your computer's IP (e.g. http://192.168.1.x:8080), then restart Expo. On simulator, use http://localhost:8080.";
  }
  if (!data && !e?.message) {
    return "Sign up failed. Check your entries and try again.";
  }
  const parts: string[] = [];
  if (data?.message && typeof data.message === "string") {
    parts.push(data.message);
  }
  if (data?.fields && typeof data.fields === "object") {
    const fieldMsgs = Object.entries(data.fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    if (fieldMsgs && !parts[0]?.includes(fieldMsgs)) parts.push(fieldMsgs);
  }
  if (parts.length > 0) return parts.join("\n\n");
  if (data?.detail) return data.detail;
  if (e?.response?.status === 409) return "An account with this email already exists.";
  if (e?.response?.statusText) return `${e.response.status} ${e.response.statusText}`;
  if (e?.message) return e.message;
  return "Sign up failed. Check your entries and try again.";
}

const BG = "#F7F7F5";
const PURPLE = "#0A66F0";

function createStyles(theme: Theme, bottomInset: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    scrollContent: { padding: 20, paddingBottom: 120 + bottomInset },
    topBar: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
    brand: { fontSize: 18, fontWeight: "800", color: PURPLE },
    title: { fontSize: 28, fontWeight: "800", color: "#0A0A0A", marginBottom: 8 },
    subtitle: { fontSize: 15, color: "#6b6b80", marginBottom: 24 },
    fieldLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, color: PURPLE, marginBottom: 8 },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(10,102,240,0.08)",
      borderRadius: 14,
      paddingHorizontal: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "transparent",
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.colors.foreground },
    eye: { padding: 8 },
    termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 20 },
    termsText: { flex: 1, fontSize: 14, color: "#4a4a5c", lineHeight: 20 },
    termsLink: { color: PURPLE, fontWeight: "700" },
    primaryBtn: {
      backgroundColor: PURPLE,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 16,
      shadowColor: PURPLE,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    footer: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", marginBottom: 20 },
    footerText: { fontSize: 14, color: "#6b6b80" },
    footerLink: { fontSize: 14, color: PURPLE, fontWeight: "700" },
    orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
    orLine: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },
    orText: { fontSize: 11, fontWeight: "800", color: "#9ca3af", letterSpacing: 1 },
    authBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingTop: 12,
      paddingBottom: Math.max(bottomInset, 12),
      backgroundColor: "#fff",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 8,
    },
    authItem: { alignItems: "center", gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
    authItemActive: { backgroundColor: "rgba(10,102,240,0.12)" },
    authLabel: { fontSize: 11, fontWeight: "800", color: "#6b7280" },
    authLabelActive: { color: PURPLE },
  });
}

export function SignUpScreen({ navigation }: { navigation: { navigate: (name: string) => void; goBack: () => void } }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = React.useMemo(() => createStyles(theme, insets.bottom), [theme, insets.bottom]);
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role] = useState<UserRole>("USER");
  const [terms, setTerms] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const splitName = () => {
    const t = fullName.trim();
    const parts = t.split(/\s+/).filter(Boolean);
    const firstName = parts[0] ?? "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : firstName || "User";
    return { firstName, lastName };
  };

  const validate = (): string | null => {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim()) return "Email is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (password !== confirmPassword) return "Passwords don't match.";
    if (!terms) return "Please accept the terms to continue.";
    return null;
  };

  const handleSignUp = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Error", err);
      return;
    }
    const { firstName, lastName } = splitName();
    setLoading(true);
    try {
      await signUp({
        email: email.trim(),
        password,
        firstName,
        lastName,
        phoneNumber: phoneNumber.trim() || undefined,
        role,
      });
      Alert.alert("Success", "Account created! Check your email to verify your account.", [
        { text: "OK", onPress: () => navigation.navigate("Verify") },
      ]);
    } catch (err: unknown) {
      Alert.alert("Sign up failed", getSignUpErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const openHelp = () => {
    Linking.openURL(`${WEB_URL}/help`).catch(() => {});
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, { paddingTop: insets.top > 0 ? 0 : 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={PURPLE} />
          </TouchableOpacity>
          <BrandLogo size={56} />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your journey with KanamEvents today.</Text>

        <Text style={styles.fieldLabel}>FULL NAME</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor="#9ca3af"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
        </View>

        <Text style={styles.fieldLabel}>USERNAME</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="at-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="johndoe123"
            placeholderTextColor="#9ca3af"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="+1 (555) 000-0000"
            placeholderTextColor="#9ca3af"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!loading}
          />
        </View>

        <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="name@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <Text style={styles.fieldLabel}>PASSWORD</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { paddingRight: 4 }]}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            editable={!loading}
          />
          <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
            <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={22} color={PURPLE} />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="shield-checkmark-outline" size={20} color={PURPLE} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.input, { paddingRight: 4 }]}
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            editable={!loading}
          />
          <TouchableOpacity style={styles.eye} onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={22} color={PURPLE} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.termsRow} onPress={() => setTerms(!terms)} activeOpacity={0.8}>
          <Ionicons name={terms ? "checkbox" : "square-outline"} size={22} color={PURPLE} />
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.75 }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? "Creating account…" : "CREATE ACCOUNT"}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orText}>OR CONTINUE WITH</Text>
          <View style={styles.orLine} />
        </View>
      </ScrollView>

      <View style={styles.authBar}>
        <TouchableOpacity style={styles.authItem} onPress={() => navigation.navigate("Login")}>
          <Ionicons name="log-in-outline" size={24} color="#6b7280" />
          <Text style={styles.authLabel}>LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.authItem, styles.authItemActive]}>
          <Ionicons name="person-add-outline" size={24} color={PURPLE} />
          <Text style={[styles.authLabel, styles.authLabelActive]}>REGISTER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.authItem} onPress={openHelp}>
          <Ionicons name="help-circle-outline" size={24} color="#6b7280" />
          <Text style={styles.authLabel}>HELP</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
