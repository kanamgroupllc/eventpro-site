import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard, sectionLabel } from "../theme/screenStyles";
import { lightTheme } from "../theme";

/**
 * Stitch-style mobile System Health (illustrative metrics).
 */
export function AdminSystemHealthScreen() {
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[editorialCard(theme), styles.hero]}>
        <View style={styles.heroTop}>
          <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
          <Text style={[styles.heroEyebrow, { color: theme.colors.primaryForeground }]}>GLOBAL SYSTEM STATUS</Text>
        </View>
        <Text style={[styles.heroTitle, { color: theme.colors.primaryForeground }]}>All systems operational</Text>
        <Text style={[styles.heroDesc, { color: theme.colors.primaryForeground }]}>
          Your global ticketing infrastructure is performing optimally. No critical incidents in the last 24 hours.
        </Text>
        <View style={[styles.uptimeBox, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
          <Text style={[styles.uptimeText, { color: theme.colors.primaryForeground }]}>99.99% uptime (30d)</Text>
        </View>
      </View>

      <Text style={[sectionLabel(theme), { marginBottom: 12 }]}>Key metrics</Text>
      <View style={styles.grid}>
        {[
          { icon: "flash-outline" as const, label: "API latency", value: "42 ms", sub: "+2%", bar: 0.35 },
          { icon: "server-outline" as const, label: "Server load", value: "24%", sub: "Stable", bar: 0.24 },
          { icon: "people-outline" as const, label: "Active sessions", value: "8.4k", sub: "Peak", bar: 0.84 },
        ].map((m) => (
          <View key={m.label} style={[editorialCard(theme), styles.metricCard]}>
            <Ionicons name={m.icon} size={22} color={theme.colors.primary} />
            <Text style={[styles.metricValue, { color: theme.colors.foreground }]}>{m.value}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.mutedForeground }]}>{m.label}</Text>
            <Text style={[styles.metricSub, { color: theme.colors.primary }]}>{m.sub}</Text>
            <View style={[styles.barTrack, { backgroundColor: theme.colors.muted }]}>
              <View style={[styles.barFill, { width: `${Math.round(m.bar * 100)}%`, backgroundColor: theme.colors.primary }]} />
            </View>
          </View>
        ))}
      </View>

      <Text style={[sectionLabel(theme), { marginTop: 8, marginBottom: 12 }]}>Traffic trends</Text>
      <View style={[editorialCard(theme), styles.card]}>
        <View style={styles.trafficRow}>
          <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Throughput</Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.primary + "22" }]}>
            <Text style={[styles.badgeText, { color: theme.colors.primary }]}>REAL-TIME</Text>
          </View>
        </View>
        <View style={styles.bars}>
          {[40, 55, 48, 72, 65, 52, 88, 60, 45, 70, 58, 42].map((h, i) => (
            <View key={i} style={[styles.miniBar, { height: h, backgroundColor: i % 3 === 0 ? theme.colors.primary : theme.colors.primary + "66" }]} />
          ))}
        </View>
      </View>

      <Text style={[sectionLabel(theme), { marginBottom: 12 }]}>Core services</Text>
      {[
        { icon: "lock-closed-outline" as const, title: "Authentication", sub: "v2.4.1 · Global cluster", ok: true },
        { icon: "cash-outline" as const, title: "Payments engine", sub: "Stripe integration active", ok: true },
        { icon: "ticket-outline" as const, title: "Ticket engine", sub: "Processing queue rising", ok: false },
        { icon: "search-outline" as const, title: "Search API", sub: "ElasticSearch cluster A", ok: true },
      ].map((s) => (
        <View key={s.title} style={[editorialCard(theme), styles.serviceRow]}>
          <Ionicons name={s.icon} size={22} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.serviceTitle, { color: theme.colors.foreground }]}>{s.title}</Text>
            <Text style={[styles.serviceSub, { color: theme.colors.mutedForeground }]}>{s.sub}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: s.ok ? theme.colors.success : "#f97316" }]} />
        </View>
      ))}

      <Text style={[sectionLabel(theme), { marginTop: 8, marginBottom: 12 }]}>Activity log</Text>
      {[
        { when: "Today, 14:22", title: "Routine database maintenance", detail: "Optimization on postgres master" },
        { when: "Yesterday, 09:15", title: "Security patch v4.2.0", detail: "Rolled out to EU regions" },
      ].map((row) => (
        <View key={row.when} style={styles.timelineRow}>
          <View style={[styles.timelineDot, { backgroundColor: theme.colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tlWhen, { color: theme.colors.mutedForeground }]}>{row.when}</Text>
            <Text style={[styles.tlTitle, { color: theme.colors.foreground }]}>{row.title}</Text>
            <Text style={[styles.tlDetail, { color: theme.colors.mutedForeground }]}>{row.detail}</Text>
          </View>
        </View>
      ))}

      <View style={[styles.nodeCard, { backgroundColor: "#0f172a" }]}>
        <Text style={styles.nodeTitle}>Node distribution</Text>
        <View style={styles.donutRow}>
          <View style={styles.donut}>
            <Text style={styles.donutPct}>75%</Text>
            <Text style={styles.donutCap}>capacity</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: theme.colors.primary }]} />
              <Text style={styles.legendText}>AWS US-East-2 · 12 nodes</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatch, { backgroundColor: "#38bdf8" }]} />
              <Text style={styles.legendText}>GCP Europe-West · 4 nodes</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.md, paddingBottom: 40 },
  hero: {
    padding: lightTheme.spacing.lg,
    marginBottom: lightTheme.spacing.md,
    backgroundColor: lightTheme.colors.primary,
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  heroEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  heroTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8, fontFamily: lightTheme.fontFamily.heading },
  heroDesc: { fontSize: 14, lineHeight: 20, opacity: 0.95 },
  uptimeBox: { marginTop: 12, padding: 10, borderRadius: 12, alignSelf: "flex-start" },
  uptimeText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  metricCard: { width: "31%", minWidth: 100, flexGrow: 1, padding: 12 },
  metricValue: { fontSize: 18, fontWeight: "800", marginTop: 8 },
  metricLabel: { fontSize: 11, marginTop: 2 },
  metricSub: { fontSize: 10, fontWeight: "600", marginTop: 4 },
  barTrack: { height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 2 },
  card: { padding: lightTheme.spacing.md, marginBottom: lightTheme.spacing.md },
  trafficRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", height: 100, gap: 4 },
  miniBar: { flex: 1, borderRadius: 4, minHeight: 16 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 8 },
  serviceTitle: { fontSize: 15, fontWeight: "700" },
  serviceSub: { fontSize: 12, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  timelineRow: { flexDirection: "row", gap: 12, marginBottom: 16, paddingLeft: 4 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  tlWhen: { fontSize: 12 },
  tlTitle: { fontSize: 15, fontWeight: "600", marginTop: 2 },
  tlDetail: { fontSize: 13, marginTop: 4 },
  nodeCard: { borderRadius: lightTheme.radius.lg, padding: lightTheme.spacing.md, marginTop: 8 },
  nodeTitle: { color: "#e2e8f0", fontSize: 16, fontWeight: "700", marginBottom: 12 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  donut: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 10,
    borderColor: "#0A66F0",
    justifyContent: "center",
    alignItems: "center",
  },
  donutPct: { color: "#fff", fontSize: 20, fontWeight: "800" },
  donutCap: { color: "#94a3b8", fontSize: 10, fontWeight: "600" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: "#e2e8f0", fontSize: 13 },
});
