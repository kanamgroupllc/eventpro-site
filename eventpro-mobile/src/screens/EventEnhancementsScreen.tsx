import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { EventAddon } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";
import { canUseAddons } from "../lib/organizerTiers";

export function EventEnhancementsScreen({ route, navigation }: { route: { params: { eventId: string } }; navigation?: any }) {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const [addons, setAddons] = useState<EventAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const allowed = canUseAddons(user?.subscriptionTier);
  const goToPricing = () => navigation?.getParent()?.getParent()?.navigate("Profile", { screen: "Pricing" });

  const load = async () => {
    try {
      const data = await api.getEventAddons(route.params.eventId);
      setAddons(Array.isArray(data) ? data : []);
    } catch {
      setAddons([]);
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

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <View style={[editorialCard(theme), styles.upgradeCard]}>
          <Ionicons name="lock-closed-outline" size={48} color={theme.colors.mutedForeground} />
          <Text style={[styles.upgradeTitle, { color: theme.colors.foreground }]}>Enhancements (Pro)</Text>
          <Text style={[styles.upgradeDesc, { color: theme.colors.mutedForeground }]}>
            Merchandise and add-ons are available on Pro and Enterprise plans.
          </Text>
          <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: theme.colors.primary }]} onPress={goToPricing}>
            <Text style={[styles.upgradeBtnText, { color: theme.colors.primaryForeground }]}>View plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[sectionLabel(theme), { marginBottom: 8, paddingHorizontal: lightTheme.spacing.md, paddingTop: lightTheme.spacing.sm }]}>
        Add-ons
      </Text>
      <Text style={[styles.hint, { color: theme.colors.mutedForeground }]}>
        Add-ons and merchandise. Add or edit on the web app.
      </Text>
      <FlatList
        data={addons}
        keyExtractor={(item) => item.id}
        contentContainerStyle={addons.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No add-ons yet.</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        renderItem={({ item }) => (
          <View style={[editorialCard(theme), styles.card]}>
            <Text style={[styles.name, { color: theme.colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.price, { color: theme.colors.foreground }]}>${Number(item.price).toFixed(2)}</Text>
            {item.category ? (
              <Text style={[styles.meta, { color: theme.colors.mutedForeground }]}>Category: {item.category}</Text>
            ) : null}
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
  upgradeCard: { margin: lightTheme.spacing.lg, padding: 24, alignItems: "center", maxWidth: 320 },
  upgradeTitle: { fontSize: 20, fontWeight: "700", marginTop: 16 },
  upgradeDesc: { fontSize: 14, textAlign: "center", marginTop: 8 },
  upgradeBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: lightTheme.radius.md },
  upgradeBtnText: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  list: { padding: lightTheme.spacing.md, paddingTop: 0 },
  emptyList: { flexGrow: 1, padding: lightTheme.spacing.md },
  empty: { textAlign: "center", marginTop: 24 },
  card: { padding: 16, marginBottom: 12 },
  name: { fontSize: 17, fontWeight: "600" },
  price: { fontSize: 18, fontWeight: "700", marginTop: 6 },
  meta: { fontSize: 14, marginTop: 4 },
  desc: { fontSize: 13, marginTop: 6 },
});
