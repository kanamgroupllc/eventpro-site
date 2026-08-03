import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";

const BG = "#F9F5FF";

const CHATS = [
  { id: "1", name: "Elena Rodriguez", subject: "Ticket Refund Request", time: "3m ago", vip: false, active: false },
  { id: "2", name: "Marcus Chen", subject: "Booking Confirmation Error", time: "1m ago", vip: true, active: true },
  { id: "3", name: "Jordan Smyth", subject: "Change Seat Assignment", time: "5m ago", vip: false, active: false },
];

export function SupportAgentWorkspaceScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.headIcon, { backgroundColor: theme.colors.primary + "22" }]}>
          <Ionicons name="headset" size={22} color={theme.colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>Agent Workspace</Text>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="person" size={20} color={theme.colors.mutedForeground} />
          </View>
          <View style={styles.onlineDot} />
        </View>
      </View>

      <View style={styles.perfHeader}>
        <Text style={[styles.h2, { color: theme.colors.foreground }]}>Performance</Text>
        <Text style={styles.realtime}>REAL-TIME</Text>
      </View>
      <View style={styles.kpiRow}>
        <View style={[editorialCard(theme), styles.kpiWhite]}>
          <Ionicons name="timer-outline" size={24} color="#dc2626" />
          <Text style={styles.kpiLbl}>AVG RESPONSE</Text>
          <Text style={styles.kpiVal}>2m 15s</Text>
        </View>
        <LinearGradientKpi>
          <Ionicons name="star" size={24} color="#fff" />
          <Text style={styles.kpiLblLight}>CSAT SCORE</Text>
          <Text style={styles.kpiValLight}>4.8/5.0</Text>
        </LinearGradientKpi>
      </View>

      <View style={styles.liveHead}>
        <Text style={[styles.h2, { color: theme.colors.foreground }]}>Live Chats</Text>
        <View style={styles.waitingPill}>
          <Text style={styles.waitingText}>• 4 WAITING</Text>
        </View>
      </View>
      {CHATS.map((c) => (
        <TouchableOpacity
          key={c.id}
          style={[
            styles.chatRow,
            c.active && { borderLeftWidth: 4, borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.card },
          ]}
          activeOpacity={0.9}
        >
          <View style={[styles.chatAvatar, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="person" size={18} color={theme.colors.mutedForeground} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={[styles.chatName, { color: theme.colors.foreground }]}>{c.name}</Text>
              {c.vip ? (
                <View style={[styles.vip, { backgroundColor: theme.colors.primary + "20" }]}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.primary }}>VIP</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.chatSub, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
              {c.subject}
            </Text>
          </View>
          <Text style={[styles.chatTime, { color: theme.colors.mutedForeground }]}>{c.time}</Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.h2, { color: theme.colors.foreground, marginTop: 20, marginBottom: 12 }]}>Ticket Summary</Text>
      <View style={[editorialCard(theme), styles.summaryCard]}>
        <SummaryRow color="#9d1743" label="High Priority" count="12" extra />
        <SummaryRow color={theme.colors.primary} label="Medium Priority" count="28" />
        <SummaryRow color="#e9d5ff" label="Low Priority" count="45" />
      </View>

      <TouchableOpacity style={[styles.fab, { backgroundColor: "#913155" }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.bottomTabs, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.tabActive, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="chatbubbles" size={22} color="#fff" />
          <Text style={styles.tabActiveText}>Chat View</Text>
        </View>
        <View style={styles.tab}>
          <Ionicons name="ticket-outline" size={22} color="#9ca3af" />
          <Text style={styles.tabText}>Ticket View</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function LinearGradientKpi({ children }: { children: React.ReactNode }) {
  return <View style={[styles.kpiPurple]}>{children}</View>;
}

function SummaryRow({ color, label, count, extra }: { color: string; label: string; count: string; extra?: boolean }) {
  return (
    <View style={[styles.sumRow, { borderLeftColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sumLabel}>{label}</Text>
        <Text style={styles.sumCount}>{count} Tickets</Text>
      </View>
      {extra ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={styles.miniAv} />
          <View style={styles.miniAv} />
          <Text style={styles.plus}>+3</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  headIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "900", flex: 1, textAlign: "center" },
  avatarWrap: { position: "relative" },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  perfHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  h2: { fontSize: 18, fontWeight: "900" },
  realtime: { fontSize: 11, fontWeight: "900", color: "#be185d" },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  kpiWhite: { flex: 1, padding: 14, gap: 8 },
  kpiPurple: {
    flex: 1,
    padding: 14,
    gap: 8,
    borderRadius: 16,
    backgroundColor: "#6347d1",
  },
  kpiLbl: { fontSize: 10, fontWeight: "800", color: "#6b7280" },
  kpiVal: { fontSize: 22, fontWeight: "900", color: "#1e1b4b" },
  kpiLblLight: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.85)" },
  kpiValLight: { fontSize: 22, fontWeight: "900", color: "#fff" },
  liveHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  waitingPill: { backgroundColor: "#fce7f3", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  waitingText: { fontSize: 11, fontWeight: "900", color: "#be185d" },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, marginBottom: 8 },
  chatAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  chatName: { fontSize: 16, fontWeight: "800" },
  chatSub: { fontSize: 13, marginTop: 2 },
  chatTime: { fontSize: 12, fontWeight: "600" },
  vip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  summaryCard: { padding: 0, overflow: "hidden", marginBottom: 56 },
  sumRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderLeftWidth: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  sumLabel: { fontSize: 12, fontWeight: "800", color: "#374151" },
  sumCount: { fontSize: 15, fontWeight: "700", color: "#111", marginTop: 4 },
  miniAv: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#d1d5db" },
  plus: { fontSize: 12, fontWeight: "800", color: "#6b7280" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  bottomTabs: {
    flexDirection: "row",
    marginTop: 16,
    borderRadius: 16,
    padding: 8,
    gap: 8,
  },
  tabActive: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12 },
  tabActiveText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  tabText: { color: "#9ca3af", fontWeight: "700", fontSize: 13 },
});
