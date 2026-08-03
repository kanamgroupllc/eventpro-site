import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";
import type { RefundSuccessRouteParams } from "../navigation/types";

const BG = "#F8F7FF";
const PURPLE = "#7B61FF";
const TEXT_DARK = "#2D2D44";

export function RefundSuccessScreen({
  route,
  navigation,
}: {
  route: { params?: RefundSuccessRouteParams };
  navigation: { navigate: (name: string) => void; goBack: () => void };
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const p = route.params ?? {};
  const amount = p.amountFormatted ?? "$149.00";
  const recipient = p.recipientName ?? "Julian Vance";
  const txnId = p.transactionId ?? "TXN-9920-REF-VANCE";
  const when = p.timestampLabel ?? "Oct 24, 2:45 PM";
  const method = p.paymentMethodLabel ?? "Visa •••• 4242";

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: BG }]} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.successRing}>
          <LinearGradient colors={[PURPLE, "#9b85ff"]} style={styles.successCircle}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={[styles.headline, { color: TEXT_DARK }]}>Refund Successful</Text>
        <Text style={[styles.sub, { color: theme.colors.mutedForeground }]}>
          The transaction has been processed and funds are being returned.
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.amount, { color: "#4a1942" }]}>{amount}</Text>
        <View style={styles.recipientRow}>
          <Ionicons name="wallet-outline" size={18} color={TEXT_DARK} />
          <Text style={[styles.recipientText, { color: TEXT_DARK }]}>Refunded to {recipient}</Text>
        </View>
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
        <Text style={[styles.txnLabel, { color: theme.colors.primary }]}>TRANSACTION ID</Text>
        <View style={[styles.txnPill, { backgroundColor: theme.colors.primary + "18" }]}>
          <Text style={[styles.txnValue, { color: theme.colors.primary }]}>{txnId}</Text>
        </View>
      </View>

      <View style={[styles.infoRow, { backgroundColor: theme.colors.primary + "12" }]}>
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + "22" }]}>
          <Ionicons name="time-outline" size={20} color={TEXT_DARK} />
        </View>
        <View>
          <Text style={[styles.infoLabel, { color: theme.colors.mutedForeground }]}>Timestamp</Text>
          <Text style={[styles.infoValue, { color: TEXT_DARK }]}>{when}</Text>
        </View>
      </View>

      <View style={[styles.infoRow, { backgroundColor: theme.colors.primary + "12" }]}>
        <View style={[styles.infoIcon, { backgroundColor: theme.colors.primary + "22" }]}>
          <Ionicons name="card-outline" size={20} color={TEXT_DARK} />
        </View>
        <View>
          <Text style={[styles.infoLabel, { color: theme.colors.mutedForeground }]}>Payment Method</Text>
          <Text style={[styles.infoValue, { color: TEXT_DARK }]}>{method}</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate("TicketsHome")} style={styles.btnWrap}>
        <LinearGradient colors={[PURPLE, "#6348d9"]} style={styles.gradientBtn}>
          <Text style={styles.btnLight}>Back to Dashboard</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, { backgroundColor: theme.colors.primary + "14" }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.9}
      >
        <Text style={[styles.secondaryText, { color: theme.colors.primary }]}>View Transaction Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    hero: { alignItems: "center", marginBottom: 24 },
    successRing: { marginBottom: 16 },
    successCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      justifyContent: "center",
      alignItems: "center",
    },
    headline: { fontSize: 26, fontWeight: "800", marginBottom: 8, textAlign: "center" },
    sub: { fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 12 },
    card: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    amount: { fontSize: 32, fontWeight: "800", marginBottom: 10 },
    recipientRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    recipientText: { fontSize: 15, fontWeight: "600" },
    line: { height: 1, marginVertical: 16 },
    txnLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
    txnPill: { alignSelf: "flex-start", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    txnValue: { fontSize: 14, fontWeight: "700" },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      borderRadius: 16,
      marginBottom: 10,
    },
    infoIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    infoLabel: { fontSize: 12, marginBottom: 2 },
    infoValue: { fontSize: 15, fontWeight: "600" },
    btnWrap: { marginTop: 8, borderRadius: 999, overflow: "hidden", marginBottom: 12 },
    gradientBtn: { paddingVertical: 16, alignItems: "center", borderRadius: 999 },
    btnLight: { color: "#fff", fontSize: 16, fontWeight: "800" },
    secondaryBtn: { paddingVertical: 16, borderRadius: 999, alignItems: "center" },
    secondaryText: { fontSize: 16, fontWeight: "700" },
  });
}
