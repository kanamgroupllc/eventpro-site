import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import type { Event, SeatResponse } from "@eventpro/shared";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";
import { canUseAddons } from "../lib/organizerTiers";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:5173";

type SectionRow = { name: string; rowCount: number; seatsPerRow: number; price: number };

const emptySection = (): SectionRow => ({ name: "", rowCount: 1, seatsPerRow: 1, price: 0 });

export function SeatMapEditorScreen({
  route,
  navigation,
}: {
  route: { params?: { eventId?: string } };
  navigation: {
    navigate: (name: "SeatMapEditor", params?: { eventId?: string }) => void;
    goBack: () => void;
    getParent: () => { navigate: (name: string, p?: object) => void } | undefined;
  };
}) {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const showPro = canUseAddons(user?.subscriptionTier);

  const eventId = route.params?.eventId;

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingList, setLoadingList] = useState(!eventId);
  const [loadingEvent, setLoadingEvent] = useState(!!eventId);
  const [refreshing, setRefreshing] = useState(false);
  const [eventName, setEventName] = useState("");
  const [reservedSeatingEnabled, setReservedSeatingEnabled] = useState(false);
  const [eventSeats, setEventSeats] = useState<SeatResponse[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([emptySection()]);
  const [submitting, setSubmitting] = useState(false);

  const goPricing = () => navigation.getParent()?.navigate("Profile", { screen: "Pricing" });

  const loadEventList = useCallback(async () => {
    try {
      const list = await api.getOrganizerEvents();
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [api]);

  const loadEventDetail = useCallback(
    async (id: string) => {
      setLoadingEvent(true);
      try {
        const ev = await api.getEvent(id);
        setEventName(ev.name ?? "");
        setReservedSeatingEnabled(!!ev.reservedSeatingEnabled);
        if (ev.reservedSeatingEnabled) {
          const seats = await api.getEventSeats(id);
          setEventSeats(Array.isArray(seats) ? seats : []);
        } else {
          setEventSeats([]);
        }
      } catch {
        Alert.alert("Error", "Could not load this event.");
        navigation.navigate("SeatMapEditor", {});
      } finally {
        setLoadingEvent(false);
        setRefreshing(false);
      }
    },
    [api, navigation]
  );

  useEffect(() => {
    if (!eventId) {
      loadEventList();
    }
  }, [eventId, loadEventList]);

  useEffect(() => {
    if (eventId) {
      loadEventDetail(eventId);
    }
  }, [eventId, loadEventDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    if (eventId) loadEventDetail(eventId);
    else loadEventList();
  };

  const handleCreate = async () => {
    if (!eventId || !showPro) return;
    const payload = sections
      .filter((s) => s.name?.trim())
      .map((s) => ({
        name: s.name.trim(),
        rowCount: Math.max(1, s.rowCount),
        seatsPerRow: Math.max(1, s.seatsPerRow),
        price: Number(s.price) >= 0 ? Number(s.price) : 0,
      }));
    if (payload.length === 0) {
      Alert.alert("Add sections", "Enter at least one section name.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.createEventSeatMap(eventId, { sections: payload });
      const seats = await api.getEventSeats(eventId);
      setEventSeats(Array.isArray(seats) ? seats : []);
      Alert.alert("Success", `Created ${result.seatsCreated} seats.`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      Alert.alert("Could not create seat map", msg ?? "Try again or use the web app.");
    } finally {
      setSubmitting(false);
    }
  };

  const eventsWithReserved = events.filter((e) => e.reservedSeatingEnabled);

  if (!showPro) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="lock-closed-outline" size={40} color={theme.colors.mutedForeground} />
        <Text style={[styles.title, { color: theme.colors.foreground, marginTop: 16 }]}>Pro or Enterprise required</Text>
        <Text style={[styles.hint, { color: theme.colors.mutedForeground }]}>
          Reserved seating and seat maps are available on Pro and Enterprise.
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={goPricing}>
          <Text style={{ color: theme.colors.primaryForeground, fontWeight: "700" }}>View plans</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!eventId && loadingList) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!eventId) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Text style={[sectionLabel(theme), { marginBottom: 8 }]}>Choose an event</Text>
        <Text style={[styles.sub, { color: theme.colors.mutedForeground, marginBottom: 16 }]}>
          Seat maps are created per event. Pick one with reserved seating enabled (set in the event editor on the web).
        </Text>
        {eventsWithReserved.length === 0 ? (
          <View style={[editorialCard(theme), styles.emptyCard]}>
            <Text style={{ color: theme.colors.foreground, fontWeight: "600", marginBottom: 8 }}>No eligible events</Text>
            <Text style={{ color: theme.colors.mutedForeground, fontSize: 14, lineHeight: 20 }}>
              Enable &quot;Reserved seating&quot; on an event under Organizer → Edit event on the web, then return here.
            </Text>
          </View>
        ) : (
          eventsWithReserved.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={[editorialCard(theme), styles.pickRow]}
              onPress={() => navigation.navigate("SeatMapEditor", { eventId: ev.id })}
              activeOpacity={0.85}
            >
              <Ionicons name="grid-outline" size={22} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: theme.colors.foreground }} numberOfLines={2}>
                  {ev.name}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 }}>Reserved seating on</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
          ))
        )}
        {events.filter((e) => !e.reservedSeatingEnabled).length > 0 ? (
          <Text style={{ color: theme.colors.mutedForeground, fontSize: 12, marginTop: 16 }}>
            {events.filter((e) => !e.reservedSeatingEnabled).length} other event(s) need reserved seating enabled first.
          </Text>
        ) : null}
      </ScrollView>
    );
  }

  if (loadingEvent) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!reservedSeatingEnabled) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{eventName}</Text>
        <Text style={[styles.hint, { color: theme.colors.mutedForeground, marginBottom: 16 }]}>
          Turn on reserved seating for this event in the editor, save, then come back.
        </Text>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.border }]} onPress={() => navigation.navigate("SeatMapEditor", {})}>
          <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Choose another event</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (eventSeats.length > 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <Text style={[sectionLabel(theme), { marginBottom: 8 }]}>{eventName}</Text>
        <View style={[editorialCard(theme), styles.successCard]}>
          <Ionicons name="checkmark-circle" size={36} color={theme.colors.success} />
          <Text style={[styles.title, { color: theme.colors.foreground, marginTop: 12 }]}>Seat map ready</Text>
          <Text style={[styles.hint, { color: theme.colors.mutedForeground }]}>
            {eventSeats.length} seats created. Buyers can pick seats on the event page.
          </Text>
        </View>
        <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.border, marginTop: 16 }]} onPress={() => navigation.navigate("SeatMapEditor", {})}>
          <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>Another event</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.navigate("SeatMapEditor", {})} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
          {eventName}
        </Text>
      </View>

      <Text style={[sectionLabel(theme), { marginBottom: 8 }]}>Sections</Text>
      <Text style={[styles.sub, { color: theme.colors.mutedForeground, marginBottom: 12 }]}>
        Each section becomes rows × seats with one base price per seat (same as web).
      </Text>

      {sections.map((row, idx) => (
        <View key={idx} style={[editorialCard(theme), styles.sectionCard]}>
          <TextInput
            style={[styles.input, { color: theme.colors.foreground, borderColor: theme.colors.border }]}
            placeholder="Section name (e.g. Orchestra)"
            placeholderTextColor={theme.colors.mutedForeground}
            value={row.name}
            onChangeText={(t) => setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, name: t } : s)))}
          />
          <View style={styles.row3}>
            <View style={styles.field}>
              <Text style={[styles.lbl, { color: theme.colors.mutedForeground }]}>Rows</Text>
              <TextInput
                style={[styles.inputSm, { color: theme.colors.foreground, borderColor: theme.colors.border }]}
                keyboardType="number-pad"
                value={String(row.rowCount)}
                onChangeText={(t) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, rowCount: Math.max(1, parseInt(t, 10) || 1) } : s))
                  )
                }
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.lbl, { color: theme.colors.mutedForeground }]}>Seats/row</Text>
              <TextInput
                style={[styles.inputSm, { color: theme.colors.foreground, borderColor: theme.colors.border }]}
                keyboardType="number-pad"
                value={String(row.seatsPerRow)}
                onChangeText={(t) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, seatsPerRow: Math.max(1, parseInt(t, 10) || 1) } : s))
                  )
                }
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.lbl, { color: theme.colors.mutedForeground }]}>Price $</Text>
              <TextInput
                style={[styles.inputSm, { color: theme.colors.foreground, borderColor: theme.colors.border }]}
                keyboardType="decimal-pad"
                value={String(row.price)}
                onChangeText={(t) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, price: parseFloat(t) || 0 } : s))
                  )
                }
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => setSections((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))}
            disabled={sections.length <= 1}
          >
            <Ionicons name="trash-outline" size={18} color={sections.length <= 1 ? theme.colors.mutedForeground : theme.colors.destructive} />
            <Text style={{ color: sections.length <= 1 ? theme.colors.mutedForeground : theme.colors.destructive, fontWeight: "600" }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.addBtn, { borderColor: theme.colors.primary }]}
        onPress={() => setSections((prev) => [...prev, emptySection()])}
      >
        <Ionicons name="add" size={20} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: "700" }}>Add section</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: theme.colors.primary, opacity: submitting ? 0.7 : 1 }]}
        onPress={handleCreate}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color={theme.colors.primaryForeground} />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={22} color={theme.colors.primaryForeground} />
            <Text style={[styles.createBtnText, { color: theme.colors.primaryForeground }]}>Create seat map</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.foot, { color: theme.colors.mutedForeground }]}>
        Full visual editor: {WEB_URL}/organizer/events/{eventId}/seat-map
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  content: { padding: lightTheme.spacing.lg, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: "800" },
  sub: { fontSize: 14, lineHeight: 20 },
  hint: { fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 16 },
  primaryBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: lightTheme.radius.md },
  emptyCard: { padding: 16 },
  pickRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginBottom: 10 },
  outlineBtn: { alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 16, borderRadius: lightTheme.radius.md, borderWidth: 1 },
  successCard: { alignItems: "center", padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: "800" },
  sectionCard: { marginBottom: 12, padding: 12 },
  input: {
    borderWidth: 1,
    borderRadius: lightTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  row3: { flexDirection: "row", gap: 8 },
  field: { flex: 1 },
  lbl: { fontSize: 11, fontWeight: "700", marginBottom: 4 },
  inputSm: {
    borderWidth: 1,
    borderRadius: lightTheme.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 15,
  },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: lightTheme.radius.md,
    borderWidth: 2,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: lightTheme.radius.lg,
  },
  createBtnText: { fontSize: 17, fontWeight: "800" },
  foot: { fontSize: 11, marginTop: 20, textAlign: "center" },
});
