import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useAuth } from "../context/AuthContext";
import type { EventSales } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

export function AdminEventSalesScreen() {
  const { theme } = useTheme();
  const { api } = useAuth();
  const [sales, setSales] = useState<EventSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.getEventSales();
      setSales(Array.isArray(data) ? data : []);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={sales}
        keyExtractor={(item) => item.eventId}
        contentContainerStyle={sales.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <Text style={[sectionLabel(theme), { marginBottom: 12, paddingHorizontal: lightTheme.spacing.lg }]}>
            By event
          </Text>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No event sales data.</Text>}
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
        renderItem={({ item }) => (
          <View style={[editorialCard(theme), styles.card]}>
            <Text style={[styles.name, { color: theme.colors.foreground }]}>{item.eventName}</Text>
            <Text style={[styles.meta, { color: theme.colors.mutedForeground }]}>
              Sold: {item.ticketsSold} · Revenue: ${Number(item.revenue).toFixed(2)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: lightTheme.spacing.lg, paddingTop: 0 },
  emptyList: { flexGrow: 1, padding: lightTheme.spacing.lg },
  empty: { textAlign: "center", marginTop: 24 },
  card: { padding: 16, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: "600" },
  meta: { fontSize: 14, marginTop: 4 },
});
