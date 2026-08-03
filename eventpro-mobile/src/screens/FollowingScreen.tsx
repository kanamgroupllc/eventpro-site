import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { theme as staticTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";
import type { FollowedOrganizerItem } from "../lib/mobileApi";
import * as mobileApi from "../lib/mobileApi";

export function FollowingScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const [list, setList] = useState<FollowedOrganizerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mobileApi
      .getFollowing()
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={[styles.centered, styles.empty, { backgroundColor: theme.colors.background }]}>
        <View style={[editorialCard(theme), { padding: 24, alignItems: "center", maxWidth: 400, width: "100%" }]}>
          <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>Not following anyone yet</Text>
          <Text style={[styles.emptyDesc, { color: theme.colors.mutedForeground }]}>
            Go to an event and tap Follow next to the organizer.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.organizerId}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={[sectionLabel(theme), { marginBottom: 6 }]}>Your network</Text>
            <Text style={{ fontSize: 15, color: theme.colors.mutedForeground, lineHeight: 22 }}>
              Organizers you follow appear here
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[editorialCard(theme), styles.row]}
            onPress={() => navigation.getParent()?.navigate("Discover", { screen: "EventsList", params: { organizerId: item.organizerId } })}
          >
            {item.profilePictureUrl ? (
              <Image source={{ uri: item.profilePictureUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={[styles.avatarText, { color: theme.colors.mutedForeground }]}>
                  {[item.firstName, item.lastName].filter(Boolean).map((s) => (s ?? "").charAt(0)).join("") || "?"}
                </Text>
              </View>
            )}
            <Text style={[styles.name, { color: theme.colors.foreground }]}>
              {[item.firstName, item.lastName].filter(Boolean).join(" ") || "Organizer"}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center" },
  list: { padding: staticTheme.spacing.md, paddingTop: 8 },
  listHeader: { marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontWeight: "600" },
  name: { marginLeft: 12, fontSize: 16, fontWeight: "600", flex: 1 },
});
