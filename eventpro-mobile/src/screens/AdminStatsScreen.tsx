import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useAuth } from "../context/AuthContext";
import type { AdminStats } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import type { Theme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

function StatCard({
  title,
  value,
  sub,
  theme,
}: {
  title: string;
  value: string;
  sub?: string;
  theme: Theme;
}) {
  return (
    <View style={[editorialCard(theme), styles.statCard]}>
      <Text style={[styles.statTitle, { color: theme.colors.mutedForeground }]}>{title}</Text>
      <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
      {sub != null && <Text style={[styles.statSub, { color: theme.colors.mutedForeground }]}>{sub}</Text>}
    </View>
  );
}

function formatGrowth(n: number) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function AdminStatsScreen() {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    load();
  }, [api, user?.role]);

  if (user?.role !== "ADMIN") {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.forbidden, { color: theme.colors.mutedForeground }]}>Admin only.</Text>
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

  if (!stats) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.forbidden, { color: theme.colors.mutedForeground }]}>Failed to load stats.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={[sectionLabel(theme), { marginBottom: 8 }]}>Metrics</Text>
      </View>
      <View style={styles.grid}>
        <StatCard title="Total users" value={stats.totalUsers.toLocaleString()} sub={formatGrowth(stats.userGrowth)} theme={theme} />
        <StatCard title="Total events" value={stats.totalEvents.toLocaleString()} sub={formatGrowth(stats.eventGrowth)} theme={theme} />
        <StatCard title="Tickets sold" value={stats.totalTicketsSold.toLocaleString()} sub={formatGrowth(stats.ticketGrowth)} theme={theme} />
        <StatCard
          title="Total revenue"
          value={`$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub={formatGrowth(stats.revenueGrowth)}
          theme={theme}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  forbidden: { fontSize: 16 },
  header: { marginBottom: 12 },
  grid: { gap: 12 },
  statCard: { padding: 16 },
  statTitle: { fontSize: 13, fontWeight: "500" },
  statValue: { fontSize: 24, fontWeight: "700", marginTop: 4 },
  statSub: { fontSize: 13, marginTop: 4 },
});
