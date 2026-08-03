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
  ScrollView,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { BrandLogo } from "../components/BrandLogo";
import type { Theme } from "../theme";

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 40 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      paddingVertical: 12,
    },
    brand: { flex: 1, alignItems: "center", marginRight: 32 },
    hero: {
      marginHorizontal: 16,
      height: 180,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 16,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(10,10,10,0.35)",
      justifyContent: "center",
      alignItems: "center",
    },
    lockBadge: {
      width: 72,
      height: 72,
      borderRadius: 16,
      backgroundColor: "rgba(255,255,255,0.25)",
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    },
    card: {
      marginHorizontal: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      padding: 22,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: "#36274e",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
      elevation: 4,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
      marginBottom: 10,
      color: "#0A0A0A",
      fontFamily: theme.fontFamily.heading,
    },
    desc: { fontSize: 15, color: theme.colors.mutedForeground, marginBottom: 22, lineHeight: 22 },
    label: { fontSize: 13, fontWeight: "700", color: "#0A0A0A", marginBottom: 8 },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: "#E8F1FE",
      paddingHorizontal: 14,
      gap: 10,
      marginBottom: 8,
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.colors.foreground },
    error: { color: theme.colors.destructive, marginBottom: 12, fontSize: 14 },
    primaryBtn: {
      backgroundColor: "#0A66F0",
      paddingVertical: 16,
      borderRadius: 16,
      alignItems: "center",
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      shadowColor: "#0A66F0",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 6,
    },
    btnDisabled: { opacity: 0.7 },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
    backLogin: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 20,
    },
    backLoginText: { fontSize: 13, fontWeight: "800", color: "#0A66F0", letterSpacing: 0.6 },
    footer: { textAlign: "center", marginTop: 28, paddingHorizontal: 24, fontSize: 13, color: theme.colors.mutedForeground },
    tryAgain: { color: "#9f1239", fontWeight: "700" },
  });
}

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    const e = email.trim();
    if (!e) {
      setError("Enter your email.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setError("Enter a valid email address.");
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
      await new Promise((r) => setTimeout(r, 1000));
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { justifyContent: "center", padding: 24 }]}>
        <View style={styles.card}>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.desc}>
            We&apos;ve sent password reset instructions to {email.trim()}. Check your inbox and follow the link.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ width: 40 }}>
            <Ionicons name="chevron-back" size={26} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.brand}>
            <BrandLogo size={56} />
          </View>
        </View>

        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=900&q=80" }}
          style={styles.hero}
          imageStyle={{ borderRadius: 20 }}
        >
          <View style={styles.heroOverlay}>
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={36} color="#fff" />
            </View>
          </View>
        </ImageBackground>

        <View style={styles.card}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.desc}>
            Enter your email to receive a reset link. We&apos;ll help you get back to the music in no time.
          </Text>

          <Text style={styles.label}>Email address</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={20} color="#71717a" />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError(null);
              }}
              placeholder="name@example.com"
              placeholderTextColor="#a1a1aa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Send reset link</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLogin} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#0A66F0" />
            <Text style={styles.backLoginText}>BACK TO LOGIN</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Didn&apos;t receive an email? Check your spam folder or{" "}
          <Text style={styles.tryAgain} onPress={handleSubmit}>
            try again.
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
