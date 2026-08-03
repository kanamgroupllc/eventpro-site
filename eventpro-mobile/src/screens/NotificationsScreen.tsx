import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import type { UserNotification } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function NotificationsScreen({ navigation }: { navigation: any }) {
  const { api } = useAuth();
  const { theme } = useTheme();
  const [list, setList] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getMyNotifications(0, 50);
      setList(res.content ?? []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await api.markNotificationRead(id);
        setList((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, status: "READ" as const, readAt: new Date().toISOString() } : n
          )
        );
      } catch {}
    },
    [api]
  );

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
        data={list}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[sectionLabel(theme), { marginBottom: 6 }]}>Inbox</Text>
            <Text style={[styles.listHeaderSub, { color: theme.colors.mutedForeground }]}>
              Updates from KanamEvents
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No notifications yet.</Text>
        }
        contentContainerStyle={list.length === 0 ? styles.emptyList : styles.listContent}
        renderItem={({ item }) => {
          const unread = item.status === "UNREAD";
          return (
            <TouchableOpacity
              style={[
                editorialCard(theme),
                styles.card,
                unread && [styles.cardUnread, { borderLeftColor: theme.colors.primary }],
              ]}
              activeOpacity={0.7}
              onPress={() => unread && markAsRead(item.id)}
            >
              <Text style={[styles.title, { color: theme.colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.message, { color: theme.colors.mutedForeground }]} numberOfLines={2}>
                {item.message}
              </Text>
              <Text style={[styles.time, { color: theme.colors.mutedForeground }]}>{formatTime(item.createdAt)}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listHeader: { paddingTop: 8, paddingBottom: 12 },
  listHeaderSub: { fontSize: 14, marginTop: 4 },
  listContent: { padding: lightTheme.spacing.md, paddingTop: 0, paddingBottom: 32 },
  emptyList: { flexGrow: 1, padding: lightTheme.spacing.md },
  empty: { textAlign: "center", marginTop: 24 },
  card: { padding: 16, marginBottom: 12 },
  cardUnread: { borderLeftWidth: 4 },
  title: { fontSize: 16, fontWeight: "600" },
  message: { fontSize: 14, marginTop: 4 },
  time: { fontSize: 12, marginTop: 8 },
});
