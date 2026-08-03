import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useAuth } from "../context/AuthContext";
import type { Event } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

export function AdminEventsScreen() {
  const { theme } = useTheme();
  const { api } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.getEventsPage(1, 50);
      setEvents(res.content ?? []);
    } catch {
      setEvents([]);
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
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={events.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <Text style={[sectionLabel(theme), { marginBottom: 12, paddingHorizontal: lightTheme.spacing.lg }]}>
            All events
          </Text>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No events.</Text>}
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
            <Text style={[styles.name, { color: theme.colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.meta, { color: theme.colors.mutedForeground }]}>
              {(item as any).startTime ? new Date((item as any).startTime).toLocaleDateString() : "—"}
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
