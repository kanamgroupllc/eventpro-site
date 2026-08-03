import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";

const BG = "#faf8ff";
const PURPLE = "#5D3FD3";

export function TicketDetailAgentScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Ticket Details</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={22} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={[editorialCard(theme), styles.card, { marginHorizontal: 16 }]}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.muted }]}>
              <Ionicons name="person" size={32} color={theme.colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.colors.foreground }]}>Julian Vance</Text>
              <Text style={{ color: theme.colors.mutedForeground, fontSize: 14 }}>julian.v@example.com</Text>
              <View style={styles.orderPill}>
                <Text style={styles.orderPillText}>ORD-99283</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[editorialCard(theme), styles.card, { marginHorizontal: 16 }]}>
          <Text style={styles.k}>STATUS</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View>
              <View style={styles.activeBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.activeText}>ACTIVE</Text>
              </View>
              <Text style={{ color: theme.colors.mutedForeground, fontSize: 13, marginTop: 8 }}>#EVP-99283-SLST</Text>
            </View>
            <View style={[styles.ticketThumb, { backgroundColor: theme.colors.muted }]}>
              <Ionicons name="qr-code" size={40} color={PURPLE} />
            </View>
          </View>
        </View>

        <View style={{ marginHorizontal: 16, borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
          <View style={[styles.eventHero, { backgroundColor: PURPLE }]}>
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredText}>FEATURED EVENT</Text>
            </View>
            <Text style={styles.eventHeroTitle}>Solstice Festival</Text>
          </View>
          <View style={[editorialCard(theme), { borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 16 }]}>
            {[
              { icon: "calendar-outline" as const, k: "DATE", v: "Aug 15, 2024" },
              { icon: "location-outline" as const, k: "VENUE", v: "Skyline Arena" },
              { icon: "grid-outline" as const, k: "SEAT ASSIGNMENT", v: "Section A3, Row 12, Seat 45" },
            ].map((row) => (
              <View key={row.k} style={styles.infoRow}>
                <View style={styles.iconBox}>
                  <Ionicons name={row.icon} size={20} color={PURPLE} />
                </View>
                <View>
                  <Text style={styles.k}>{row.k}</Text>
                  <Text style={{ color: theme.colors.foreground, fontWeight: "700" }}>{row.v}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[editorialCard(theme), styles.card, { marginHorizontal: 16 }]}>
          <Text style={styles.k}>PAYMENT SUMMARY</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: theme.colors.foreground }}>Ticket Price</Text>
            <Text style={{ fontWeight: "900", color: theme.colors.foreground }}>$149.00</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="card-outline" size={20} color={theme.colors.mutedForeground} />
              <Text style={{ color: theme.colors.mutedForeground }}>Visa ending 4242</Text>
            </View>
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>PAID</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.k, { marginHorizontal: 20, marginBottom: 8 }]}>INTERNAL HISTORY</Text>
        <View style={{ marginHorizontal: 16, paddingLeft: 8 }}>
          <View style={styles.historyItem}>
            <View style={[styles.hDot, { backgroundColor: "#2563eb" }]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", color: theme.colors.foreground }}>Sarah Miller (Senior Lead)</Text>
                <Text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>2h ago</Text>
              </View>
              <Text style={{ fontStyle: "italic", color: theme.colors.mutedForeground, marginTop: 6, fontSize: 13 }}>
                Customer requested refund due to emergency. Advised to provide medical documentation for escalation.
              </Text>
            </View>
          </View>
          <View style={styles.historyItem}>
            <View style={[styles.hDot, { backgroundColor: "#9ca3af" }]} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "800", color: theme.colors.foreground }}>Automated System</Text>
                <Text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>Yesterday</Text>
              </View>
              <Text style={{ color: theme.colors.mutedForeground, marginTop: 6, fontSize: 13 }}>
                Ticket issued and sent to julian.v@example.com
              </Text>
            </View>
          </View>
        </View>

        <Text style={{ color: theme.colors.mutedForeground, fontSize: 12, marginHorizontal: 20, marginTop: 8 }}>
          Illustrative data — connect to support APIs when available.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.refundBtn}>
          <Ionicons name="close-circle" size={22} color="#fff" />
          <Text style={styles.refundBtnText}>Refund Ticket</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TouchableOpacity style={[styles.reissueBtn, { borderColor: PURPLE }]}>
            <Ionicons name="refresh" size={20} color={PURPLE} />
            <Text style={[styles.reissueBtnText, { color: PURPLE }]}>Reissue QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="document-text" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { fontSize: 17, fontWeight: "900", color: "#0A0A0A" },
  card: { padding: 16, marginBottom: 12 },
  userRow: { flexDirection: "row", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 18, fontWeight: "900" },
  orderPill: { alignSelf: "flex-start", backgroundColor: PURPLE + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 8 },
  orderPillText: { fontSize: 12, fontWeight: "800", color: PURPLE },
  k: { fontSize: 11, fontWeight: "800", color: "#6b7280", letterSpacing: 0.6 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  activeText: { fontWeight: "800", color: "#166534", fontSize: 12 },
  ticketThumb: { width: 72, height: 72, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  eventHero: { padding: 20, minHeight: 120, justifyContent: "flex-end" },
  featuredBadge: { position: "absolute", top: 12, left: 12, backgroundColor: "#dc2626", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  featuredText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  eventHeroTitle: { fontSize: 22, fontWeight: "900", color: "#fff" },
  infoRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: PURPLE + "18",
    justifyContent: "center",
    alignItems: "center",
  },
  paidBadge: { backgroundColor: PURPLE + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidText: { fontWeight: "900", color: PURPLE, fontSize: 11 },
  historyItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  hDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 12, marginTop: "auto", backgroundColor: "#fff", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#e5e7eb" },
  refundBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#b91c1c",
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 10,
  },
  refundBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  reissueBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    paddingVertical: 14,
    borderRadius: 16,
  },
  reissueBtnText: { fontWeight: "800" },
  fab: { width: 52, height: 52, borderRadius: 12, backgroundColor: PURPLE, justifyContent: "center", alignItems: "center" },
});
