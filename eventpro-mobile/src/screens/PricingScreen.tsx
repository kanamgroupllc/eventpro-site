import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { theme as staticTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:5173";

export function PricingScreen({ navigation }: { navigation?: any }) {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const [upgrading, setUpgrading] = useState(false);
  const currentTier = (user?.subscriptionTier ?? "BASIC").toUpperCase();
  const canUpgradeToPro = currentTier === "BASIC";

  const handleUpgradeToPro = async () => {
    if (!canUpgradeToPro || upgrading) return;
    try {
      setUpgrading(true);
      const { url } = await api.createSubscriptionCheckoutSession({
        tier: "PRO",
        period: "MONTHLY",
        successUrl: `${WEB_URL}/subscription/return?from=app`,
        cancelUrl: `${WEB_URL}/pricing`,
      });
      if (url) await Linking.openURL(url);
      else throw new Error("No checkout URL");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Could not start checkout. Try on the web.");
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[sectionLabel(theme), { marginBottom: 16 }]}>Plans</Text>
      <View style={[editorialCard(theme), styles.cardPad]}>
        <Text style={[styles.tier, { color: theme.colors.foreground }]}>Basic</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>Free</Text>
        <Text style={[styles.desc, { color: theme.colors.mutedForeground }]}>Create events and sell tickets. Perfect to get started.</Text>
      </View>
      <View style={[editorialCard(theme), styles.cardPad]}>
        <Text style={[styles.tier, { color: theme.colors.foreground }]}>Pro</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>Paid</Text>
        <Text style={[styles.desc, { color: theme.colors.mutedForeground }]}>More features, team members, and branding.</Text>
        {canUpgradeToPro && (
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleUpgradeToPro}
            disabled={upgrading}
          >
            {upgrading ? (
              <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
            ) : (
              <>
                <Ionicons name="arrow-up-circle" size={20} color={theme.colors.primaryForeground} />
                <Text style={[styles.upgradeBtnText, { color: theme.colors.primaryForeground }]}>Upgrade to Pro</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
      <View style={[editorialCard(theme), styles.cardPad]}>
        <Text style={[styles.tier, { color: theme.colors.foreground }]}>Enterprise</Text>
        <Text style={[styles.price, { color: theme.colors.primary }]}>Contact us</Text>
        <Text style={[styles.desc, { color: theme.colors.mutedForeground }]}>Custom needs, API access, and dedicated support.</Text>
      </View>
      <Text style={[styles.footnote, { color: theme.colors.mutedForeground }]}>
        After payment you’ll return to the app; your plan updates automatically.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: staticTheme.spacing.lg },
  cardPad: { padding: 20, marginBottom: 12 },
  tier: { fontSize: 18, fontWeight: "600" },
  price: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  desc: { fontSize: 14, marginTop: 8 },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: staticTheme.radius.md,
  },
  upgradeBtnText: { fontSize: 16, fontWeight: "600" },
  footnote: { fontSize: 13, marginTop: 24, textAlign: "center" },
});
