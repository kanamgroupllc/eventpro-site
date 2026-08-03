import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Event, EventProApi, User } from "@eventpro/shared";

export type RootStackParamList = {
  Events: { api: EventProApi; user: User; onLogout: () => void };
  CheckIn: { eventId?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, "Events">;

export function EventListScreen({ route, navigation }: Props) {
  const { api, user, onLogout } = route.params;
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getOrganizerEvents()
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) Alert.alert("Error", "Could not load events");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const isOrganizer = user.role === "ORGANIZER" || user.role === "ADMIN";

  if (!isOrganizer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.message}>Organizer access required for the check-in app.</Text>
        <TouchableOpacity style={styles.button} onPress={onLogout}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.empty}>No events yet. Create events in the web app.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("CheckIn", { eventId: item.id })}
          >
            <Text style={styles.eventName}>{item.name}</Text>
            <Text style={styles.eventMeta}>
              {item.status ?? "PUBLISHED"} • {item.startTime ? new Date(item.startTime).toLocaleDateString() : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  message: { textAlign: "center", marginBottom: 16, color: "#666" },
  empty: { textAlign: "center", color: "#666", marginTop: 24 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  eventName: { fontSize: 17, fontWeight: "600" },
  eventMeta: { fontSize: 13, color: "#666", marginTop: 4 },
  button: { backgroundColor: "#0a0a0a", padding: 14, borderRadius: 8, marginTop: 16 },
  buttonText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  logout: { marginTop: 24, padding: 12, alignItems: "center" },
  logoutText: { color: "#666", fontSize: 15 },
});
