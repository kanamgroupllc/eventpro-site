import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard, pageTitle } from "../theme/screenStyles";
import { lightTheme } from "../theme";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

const CATEGORIES = [
  { icon: "cart-outline" as const, title: "Buying", sub: "Tickets & payments", color: "#0A66F0" },
  { icon: "pricetag-outline" as const, title: "Selling", sub: "Listings & payouts", color: "#8e3a56" },
  { icon: "person-outline" as const, title: "Account", sub: "Security & profile", color: "#0A66F0" },
  { icon: "wallet-outline" as const, title: "Payments", sub: "Refunds & credits", color: "#4f46e5" },
];

const POPULAR = [
  "How do I transfer my ticket to a friend?",
  "My payment was declined but I was charged",
  "What is the 'Fan-Protect' guarantee?",
];

export function HelpCenterScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [q, setQ] = useState("");

  const openWeb = (path: string) => Linking.openURL(`${WEB_URL}${path}`).catch(() => {});

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[pageTitle(theme), { marginBottom: 8 }]}>
        How can we <Text style={{ fontStyle: "italic", color: theme.colors.primary }}>help</Text> you today?
      </Text>

      <View style={[styles.search, { backgroundColor: theme.colors.primary + "18", borderColor: theme.colors.border }]}>
        <Ionicons name="search-outline" size={20} color={theme.colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.foreground }]}
          placeholder="Search for FAQs, tickets, or guides…"
          placeholderTextColor={theme.colors.mutedForeground}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Browse categories</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.title}
            style={[editorialCard(theme), styles.catCard, { borderLeftWidth: 3, borderLeftColor: c.color }]}
            onPress={() => openWeb("/help")}
            activeOpacity={0.85}
          >
            <Ionicons name={c.icon} size={24} color={c.color} />
            <Text style={[styles.catTitle, { color: theme.colors.foreground }]}>{c.title}</Text>
            <Text style={[styles.catSub, { color: theme.colors.mutedForeground }]}>{c.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.popularHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground, marginBottom: 0 }]}>Popular questions</Text>
        <TouchableOpacity onPress={() => openWeb("/help")}>
          <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>View all</Text>
        </TouchableOpacity>
      </View>
      {POPULAR.map((p) => (
        <TouchableOpacity
          key={p}
          style={[editorialCard(theme), styles.faqRow]}
          onPress={() => openWeb("/help")}
        >
          <Text style={[styles.faqText, { color: theme.colors.foreground }]} numberOfLines={2}>
            {p}
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
      ))}

      <View style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.ctaTitle}>Need more help?</Text>
        <Text style={styles.ctaDesc}>Our support team is active 24/7 to help you with your event experience.</Text>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: theme.colors.card }]}
          onPress={() => navigation.navigate("LiveChatSupport")}
        >
          <Text style={[styles.ctaBtnText, { color: theme.colors.primary }]}>Contact support</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.md, paddingBottom: 40 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: lightTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: lightTheme.spacing.lg,
  },
  searchInput: { flex: 1, fontSize: 16, padding: 0 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 12, fontFamily: lightTheme.fontFamily.heading },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: lightTheme.spacing.lg },
  catCard: {
    width: "47%",
    flexGrow: 1,
    padding: 14,
    minHeight: 110,
  },
  catTitle: { fontSize: 16, fontWeight: "800", marginTop: 8 },
  catSub: { fontSize: 12, marginTop: 4 },
  popularHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  faqRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    marginBottom: 8,
  },
  faqText: { flex: 1, fontSize: 15, fontWeight: "600", paddingRight: 8 },
  cta: {
    borderRadius: lightTheme.radius.lg + 4,
    padding: lightTheme.spacing.lg,
    marginTop: lightTheme.spacing.md,
  },
  ctaTitle: { color: "#fff", fontSize: 20, fontWeight: "800", fontFamily: lightTheme.fontFamily.heading },
  ctaDesc: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 8, lineHeight: 20 },
  ctaBtn: {
    marginTop: lightTheme.spacing.md,
    paddingVertical: 14,
    borderRadius: lightTheme.radius.full,
    alignItems: "center",
  },
  ctaBtnText: { fontWeight: "800", fontSize: 16 },
});
