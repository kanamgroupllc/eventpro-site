import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";

const BG = "#F9F9FF";
const PURPLE = "#6236FF";

const AGENTS = [
  { name: "Alex Rivera", rating: "4.9", solved: "142", response: "~8m", top: true },
  { name: "Sarah Chen", rating: "4.8", solved: "128", response: "~12m", top: false },
  { name: "Jordan Smyth", rating: "4.7", solved: "115", response: "~15m", top: false },
];

export function SupportAnalyticsScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Ionicons name="bar-chart" size={26} color={PURPLE} />
          <Text style={[styles.pageTitle, { color: theme.colors.foreground }]}>Support Analytics</Text>
        </View>
        <View style={[styles.miniAv, { backgroundColor: theme.colors.muted }]}>
          <Ionicons name="person" size={18} color={theme.colors.mutedForeground} />
        </View>
      </View>

      <View style={[editorialCard(theme), styles.metricFull]}>
        <Text style={styles.metricLbl}>Total Tickets Solved</Text>
        <Text style={styles.metricBig}>1,428</Text>
        <Text style={styles.trendUp}>~ +12%</Text>
      </View>

      <View style={styles.row2}>
        <View style={[editorialCard(theme), styles.half]}>
          <Text style={styles.metricLbl}>Avg Resolution Time</Text>
          <Text style={styles.metricMid}>2.4h</Text>
          <Text style={styles.trendGood}>-15m faster</Text>
        </View>
        <View style={[editorialCard(theme), styles.half]}>
          <Text style={styles.metricLbl}>First Response</Text>
          <Text style={styles.metricMid}>18m</Text>
          <Text style={styles.trendBad}>▲ +2m delay</Text>
        </View>
      </View>

      <View style={styles.csatCard}>
        <View style={styles.csatRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.csatLbl}>CSAT Score</Text>
            <Text style={styles.csatBig}>4.8 / 5.0</Text>
            <Text style={styles.csatSub}>Customer Satisfaction</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Consistently above target (4.5)</Text>
            </View>
          </View>
          <View style={styles.csatChartCol}>
            <Ionicons name="happy-outline" size={26} color="#fff" />
            <View style={styles.wavy}>
              {[0.3, 0.6, 0.45, 0.7, 0.55, 0.85, 0.65].map((h, i) => (
                <View key={i} style={[styles.waveSeg, { height: 8 + h * 40 }]} />
              ))}
            </View>
          </View>
        </View>
      </View>

      <Text style={[styles.section, { color: theme.colors.foreground }]}>Ticket Volume</Text>
      <Text style={styles.liveNow}>Live Now</Text>
      <View style={[styles.chartBox, { backgroundColor: theme.colors.primary + "10" }]}>
        <Text style={styles.legend}>
          <Text style={{ color: PURPLE }}>● Inflow</Text> {"  "}
          <Text style={{ color: "#0A66F0" }}>● Outflow</Text>
        </Text>
        <View style={styles.placeholderChart}>
          <Text style={{ color: theme.colors.mutedForeground, fontSize: 12 }}>08:00 — 16:00</Text>
        </View>
      </View>

      <Text style={[styles.section, { color: theme.colors.foreground }]}>Pain Points</Text>
      <View style={styles.painRow}>
        {[
          ["Refunds", "42%", "#0A66F0"],
          ["Login Issues", "28%", PURPLE],
          ["Seating Map Help", "15%", "#be185d"],
          ["Promo Codes", "10%", "#c4b5fd"],
        ].map(([label, pct, col]) => (
          <View key={label as string} style={[styles.painPill, { borderColor: col }]}>
            <View style={[styles.dot, { backgroundColor: col }]} />
            <Text style={styles.painText}>
              {label} {pct}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.section, { color: theme.colors.foreground }]}>Top Performing Agents</Text>
      {AGENTS.map((a) => (
        <View key={a.name} style={[editorialCard(theme), styles.agentCard]}>
          <View style={styles.agentLeft}>
            <View style={[styles.agentAv, { backgroundColor: theme.colors.muted }]}>
              {a.top ? (
                <View style={styles.topBadge}>
                  <Text style={styles.topBadgeText}>TOP</Text>
                </View>
              ) : null}
              <Ionicons name="person" size={22} color={theme.colors.mutedForeground} />
            </View>
            <View>
              <Text style={[styles.agentName, { color: theme.colors.foreground }]}>{a.name}</Text>
              <Text style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                ★ {a.rating} · {a.solved} solved · {a.response}
              </Text>
            </View>
          </View>
        </View>
      ))}

      <View style={[styles.bottomNav, { backgroundColor: theme.colors.card }]}>
        {[
          { icon: "speedometer-outline" as const, label: "Performance", active: true },
          { icon: "happy-outline" as const, label: "CSAT", active: false },
          { icon: "ellipsis-horizontal" as const, label: "Productivity", active: false },
          { icon: "settings-outline" as const, label: "Settings", active: false },
        ].map((t) => (
          <TouchableOpacity key={t.label} style={[styles.navItem, t.active && { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name={t.icon} size={22} color={t.active ? PURPLE : "#9ca3af"} />
            <Text style={[styles.navLabel, { color: t.active ? PURPLE : "#9ca3af" }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: "900" },
  miniAv: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  metricFull: { padding: 20, marginBottom: 12 },
  metricLbl: { fontSize: 12, color: "#6b7280", fontWeight: "600", marginBottom: 4 },
  metricBig: { fontSize: 36, fontWeight: "900", color: "#1e1b4b" },
  metricMid: { fontSize: 24, fontWeight: "900", color: "#1e1b4b", marginTop: 4 },
  trendUp: { color: "#0A66F0", fontWeight: "800", marginTop: 4 },
  trendGood: { color: "#16a34a", fontWeight: "700", marginTop: 4, fontSize: 13 },
  trendBad: { color: "#dc2626", fontWeight: "700", marginTop: 4, fontSize: 13 },
  row2: { flexDirection: "row", gap: 12, marginBottom: 16 },
  half: { flex: 1, padding: 16 },
  csatCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: PURPLE,
    marginBottom: 20,
  },
  csatRow: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  csatLbl: { fontSize: 12, fontWeight: "800", color: "rgba(255,255,255,0.85)", marginBottom: 4 },
  csatBig: { fontSize: 32, fontWeight: "900", color: "#fff" },
  csatSub: { color: "rgba(255,255,255,0.88)", marginTop: 6, marginBottom: 12, fontSize: 14 },
  csatChartCol: { width: 100, alignItems: "flex-end", justifyContent: "space-between" },
  wavy: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 56, marginTop: 8 },
  waveSeg: { width: 8, backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 3 },
  pill: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  section: { fontSize: 18, fontWeight: "900", marginBottom: 6, marginTop: 8 },
  liveNow: { fontSize: 12, fontWeight: "800", color: PURPLE, marginBottom: 8 },
  chartBox: { borderRadius: 16, padding: 16, marginBottom: 16 },
  legend: { fontSize: 12, marginBottom: 12 },
  placeholderChart: { minHeight: 80, justifyContent: "center", alignItems: "center" },
  painRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  painPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  painText: { fontSize: 12, fontWeight: "700", color: "#374151" },
  agentCard: { padding: 14, marginBottom: 10 },
  agentLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  agentAv: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  topBadge: { position: "absolute", top: -4, right: -4, backgroundColor: "#0A66F0", paddingHorizontal: 6, borderRadius: 6, zIndex: 1 },
  topBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  agentName: { fontSize: 16, fontWeight: "800" },
  bottomNav: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    marginTop: 20,
    padding: 10,
    borderRadius: 16,
    gap: 8,
  },
  navItem: { alignItems: "center", padding: 10, borderRadius: 12, minWidth: 72 },
  navLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },
});
