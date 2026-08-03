import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useAuth } from "../context/AuthContext";
import type { TicketType } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { theme as staticTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";

export function EventTicketsScreen({ route }: { route: { params: { eventId: string } }; navigation?: any }) {
  const { theme } = useTheme();
  const { api } = useAuth();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.getTicketTypes(route.params.eventId);
      setTickets(data ?? []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [route.params.eventId]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "#059669";
      case "SOLD_OUT": return "#dc2626";
      case "INACTIVE": return "#6b7280";
      default: return "#6b7280";
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[sectionLabel(theme), { marginBottom: 8, paddingHorizontal: staticTheme.spacing.md, paddingTop: staticTheme.spacing.sm }]}>
        Ticket types
      </Text>
      <Text style={[styles.hint, { color: theme.colors.mutedForeground }]}>
        Manage or add ticket types on the web app.
      </Text>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={tickets.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No ticket types yet.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <View style={[editorialCard(theme), styles.card]}>
            <View style={styles.cardRow}>
              <Text style={[styles.name, { color: theme.colors.foreground }]}>{item.name}</Text>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                <Text style={styles.badgeText}>{item.status}</Text>
              </View>
            </View>
            <Text style={[styles.price, { color: theme.colors.foreground }]}>${Number(item.price).toFixed(2)}</Text>
            <Text style={[styles.meta, { color: theme.colors.mutedForeground }]}>
              Available: {item.availableQuantity ?? 0} / {item.totalQuantity ?? 0}
            </Text>
            {item.description ? (
              <Text style={[styles.desc, { color: theme.colors.mutedForeground }]} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  hint: { fontSize: 13, padding: 16, paddingBottom: 8 },
  list: { padding: staticTheme.spacing.md, paddingTop: 0 },
  emptyList: { flexGrow: 1, padding: staticTheme.spacing.md },
  empty: { textAlign: "center", marginTop: 24 },
  card: { padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  name: { fontSize: 17, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: staticTheme.radius.md },
  badgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  price: { fontSize: 18, fontWeight: "700", marginTop: 6 },
  meta: { fontSize: 14, marginTop: 4 },
  desc: { fontSize: 13, marginTop: 6 },
});
