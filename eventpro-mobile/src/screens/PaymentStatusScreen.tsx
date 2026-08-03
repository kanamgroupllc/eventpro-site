import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";
import type { PaymentStatusRouteParams } from "../navigation/types";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

const ERROR_RED = "#B00020";
const LIGHT_PURPLE = "#F3E5F5";
const DARK_PURPLE = "#1A1C2E";
const PRIMARY = "#673AB7";

export function PaymentStatusScreen({
  route,
  navigation,
}: {
  route: { params?: PaymentStatusRouteParams };
  navigation: { goBack: () => void };
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const p = route.params ?? {};
  const failed = p.outcome !== "success";
  const eventTitle = p.eventTitle ?? "Neon Echoes Festival";
  const ticketLine = p.ticketLine ?? "2x VIP Admission";
  const totalFormatted = p.totalFormatted ?? "$199.40";

  const openSupport = () => {
    Linking.openURL(`${WEB_URL}/help`).catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: "#fff" }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statusBlock}>
        <View style={styles.iconOuter}>
          <View style={styles.iconMid}>
            <View style={[styles.iconInner, failed ? { backgroundColor: ERROR_RED } : { backgroundColor: theme.colors.success }]}>
              <Ionicons name={failed ? "alert" : "checkmark"} size={36} color="#fff" />
            </View>
          </View>
        </View>
        <Text style={[styles.title, { color: DARK_PURPLE }]}>
          {failed ? "Transaction Failed" : "Payment successful"}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
          {failed
            ? "Please check your card details or try a different payment method to secure your spot."
            : "Your tickets are confirmed. You’ll find them in the Tickets tab."}
        </Text>
      </View>

      <View style={[styles.recapCard, { backgroundColor: LIGHT_PURPLE }]}>
        <View style={[styles.recapBadge, { backgroundColor: theme.colors.primary + "28" }]}>
          <Text style={[styles.recapBadgeText, { color: DARK_PURPLE }]}>ORDER RECAP</Text>
        </View>
        <View style={styles.recapTitleRow}>
          <Text style={[styles.recapEventTitle, { color: DARK_PURPLE }]} numberOfLines={2}>
            {eventTitle}
          </Text>
          <View style={[styles.ticketIconBox, { backgroundColor: theme.colors.primary + "22" }]}>
            <Ionicons name="ticket" size={20} color={PRIMARY} />
          </View>
        </View>
        <View style={styles.recapRow}>
          <Text style={[styles.recapLabel, { color: theme.colors.mutedForeground }]}>Tickets</Text>
          <Text style={[styles.recapValue, { color: DARK_PURPLE }]}>{ticketLine}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.recapRow}>
          <Text style={[styles.recapLabel, { color: theme.colors.mutedForeground }]}>Total Amount</Text>
          <Text style={[styles.totalAmount, { color: PRIMARY }]}>{totalFormatted}</Text>
        </View>
      </View>

      {failed ? (
        <>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { backgroundColor: LIGHT_PURPLE }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={[styles.secondaryBtnText, { color: PRIMARY }]}>Change Payment Method</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openSupport} style={styles.supportLink}>
            <Text style={[styles.supportText, { color: PRIMARY }]}>Contact Support</Text>
            <Ionicons name="arrow-forward" size={16} color={PRIMARY} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryBtnText}>View tickets</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    scroll: { flex: 1 },
    content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 40 },
    statusBlock: { alignItems: "center", marginBottom: 28 },
    iconOuter: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: LIGHT_PURPLE,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    iconMid: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary + "25",
      justifyContent: "center",
      alignItems: "center",
    },
    iconInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: "center",
      alignItems: "center",
    },
    title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 10 },
    subtitle: { fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: 8 },
    recapCard: {
      borderRadius: 24,
      padding: 20,
      marginBottom: 24,
    },
    recapBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      marginBottom: 14,
    },
    recapBadgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
    recapTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 },
    recapEventTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
    ticketIconBox: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    recapRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    recapLabel: { fontSize: 14 },
    recapValue: { fontSize: 14, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
    divider: { height: 1, marginVertical: 14 },
    totalAmount: { fontSize: 22, fontWeight: "800" },
    primaryBtn: {
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    secondaryBtn: {
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: "700" },
    supportLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    supportText: { fontSize: 15, fontWeight: "600" },
  });
}
