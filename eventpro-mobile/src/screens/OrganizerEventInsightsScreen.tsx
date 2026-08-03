import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { Event, OrganizerInsights, OrganizerSummary, RecentSale } from "@eventpro/shared";
import { lightTheme } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:5173";

export function OrganizerEventInsightsScreen() {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summaryData, insightsData, sales, eventList] = await Promise.all([
        api.getOrganizerSummary().catch(() => null),
        api.getOrganizerInsights().catch(() => null),
        api.getOrganizerRecentSales(50).catch(() => []),
        api.getOrganizerEvents().catch(() => []),
      ]);
      setSummary(summaryData ?? null);
      setInsights(insightsData ?? null);
      setRecentSales(Array.isArray(sales) ? sales : []);
      setEvents(Array.isArray(eventList) ? eventList : []);
    } catch {
      setSummary(null);
      setInsights(null);
      setRecentSales([]);
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const openFinancialsWeb = () => {
    Linking.openURL(`${WEB_URL}/organizer/financials`).catch(() => {});
  };

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  if (!isOrganizer) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.mutedForeground, textAlign: "center", padding: 24 }}>Organizer access required.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const publishedCount = events.filter((e) => e.status === "PUBLISHED").length;
  const totalRevenue = summary ? Number(summary.totalRevenue) || 0 : 0;
  const ticketsSold = summary?.ticketsSold ?? 0;
  const trendRaw = summary?.ticketsSoldTrendPercent;
  const trendPct =
    trendRaw != null && !Number.isNaN(Number(trendRaw)) ? Number(trendRaw) : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={theme.colors.primary}
        />
      }
    >
      <Text style={[sectionLabel(theme), { marginBottom: 12 }]}>Performance snapshot</Text>

      <View style={styles.kpiRow}>
        <View style={[editorialCard(theme), styles.kpi]}>
          <Text style={[styles.kpiLabel, { color: theme.colors.mutedForeground }]}>Revenue</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.foreground }]}>
            ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={[editorialCard(theme), styles.kpi]}>
          <Text style={[styles.kpiLabel, { color: theme.colors.mutedForeground }]}>Tickets sold</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.foreground }]}>{ticketsSold.toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={[editorialCard(theme), styles.kpi]}>
          <Text style={[styles.kpiLabel, { color: theme.colors.mutedForeground }]}>Published</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.foreground }]}>{publishedCount}</Text>
        </View>
        <View style={[editorialCard(theme), styles.kpi]}>
          <Text style={[styles.kpiLabel, { color: theme.colors.mutedForeground }]}>Page views</Text>
          <Text style={[styles.kpiValue, { color: theme.colors.mutedForeground }]}>—</Text>
          <Text style={[styles.kpiHint, { color: theme.colors.mutedForeground }]}>Analytics on web</Text>
        </View>
      </View>

      <View style={[editorialCard(theme), styles.trendCard]}>
        <View style={styles.trendHeader}>
          <Ionicons name="pulse-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Ticket trend</Text>
        </View>
        {trendPct != null ? (
          <Text style={[styles.trendBody, { color: theme.colors.foreground }]}>
            {trendPct >= 0 ? "+" : ""}
            {trendPct.toFixed(1)}% vs last month (sold tickets)
          </Text>
        ) : (
          <Text style={[styles.trendBody, { color: theme.colors.mutedForeground }]}>
            Compares ticket sales to the prior period when your data is available.
          </Text>
        )}
      </View>

      {insights?.eventPulses && insights.eventPulses.length > 0 && (
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground, marginBottom: 10 }]}>Event pulses</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {insights.eventPulses.map((p) => (
              <View key={p.eventId} style={[editorialCard(theme), styles.pulseCard]}>
                <Ionicons name="flash" size={20} color={theme.colors.primary} />
                <Text numberOfLines={1} style={{ fontWeight: "700", color: theme.colors.foreground }}>
                  {p.eventName}
                </Text>
                <Text numberOfLines={3} style={{ fontSize: 13, color: theme.colors.mutedForeground }}>
                  {p.label}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[editorialCard(theme), styles.aiCardInner]}>
        <Text style={[styles.aiLabel, { color: theme.colors.primary }]}>AI insight</Text>
        <Text style={[{ fontSize: 15, lineHeight: 22, color: theme.colors.foreground }]}>
          {insights?.aiInsight?.trim() || "Publish events and sell tickets to see tailored tips here."}
        </Text>
      </View>

      <View style={styles.block}>
        <Text style={[styles.sectionTitle, { color: theme.colors.foreground, marginBottom: 10 }]}>Recent activity</Text>
        {recentSales.length === 0 ? (
          <Text style={{ color: theme.colors.mutedForeground, fontSize: 14 }}>No sales yet.</Text>
        ) : (
          <View style={[editorialCard(theme), { overflow: "hidden" }]}>
            {recentSales.slice(0, 20).map((sale, i) => (
              <View
                key={`${sale.orderId}-${i}`}
                style={[styles.saleRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
              >
                <Text style={[styles.saleEvent, { color: theme.colors.foreground }]} numberOfLines={1}>
                  {sale.eventName}
                </Text>
                <Text style={[styles.saleDetail, { color: theme.colors.mutedForeground }]}>
                  {sale.quantity} × {sale.ticketTypeName}
                </Text>
                <Text style={[styles.saleDate, { color: theme.colors.mutedForeground }]}>
                  {sale.soldAt ? new Date(sale.soldAt).toLocaleString() : ""}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.webCta, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
        onPress={openFinancialsWeb}
        activeOpacity={0.85}
      >
        <Ionicons name="open-outline" size={22} color={theme.colors.primary} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.foreground }}>Full financials on web</Text>
          <Text style={{ fontSize: 13, color: theme.colors.mutedForeground, marginTop: 2 }}>
            Charts, exports, tax center, and deeper analytics
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: lightTheme.spacing.lg, paddingBottom: 40 },
  kpiRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  kpi: { flex: 1, padding: 14 },
  kpiLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 6 },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiHint: { fontSize: 11, marginTop: 4 },
  trendCard: { padding: 16, marginBottom: 20 },
  trendHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  trendBody: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  block: { marginBottom: 20 },
  pulseCard: { width: 240, padding: 14, gap: 6 },
  aiCardInner: { padding: 16, marginBottom: 20 },
  aiLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  saleRow: { padding: 12 },
  saleEvent: { fontSize: 15, fontWeight: "600" },
  saleDetail: { fontSize: 13, marginTop: 2 },
  saleDate: { fontSize: 12, marginTop: 2 },
  webCta: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: lightTheme.radius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
});
