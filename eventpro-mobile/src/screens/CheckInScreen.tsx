import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  LayoutAnimation,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Attendee, CheckInResult, Event, TicketType } from "@eventpro/shared";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard } from "../theme/screenStyles";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PURPLE = "#5D3FD3";
const BG = "#faf8ff";

type FilterTab = "all" | "checked" | "pending";

type Props = {
  route?: { params?: { eventId?: string; scannedTicketId?: string } };
  navigation?: {
    navigate: (n: string, p?: Record<string, unknown>) => void;
    goBack: () => void;
    setParams: (p: Record<string, unknown>) => void;
    canGoBack: () => boolean;
  };
};

function sumTicketCapacity(types: TicketType[]): number {
  return types.reduce((acc, t) => acc + (t.totalQuantity ?? 0), 0);
}

function attendeeName(a: Attendee): string {
  const parts = [a.firstName, a.lastName].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return a.email?.split("@")[0] || "Guest";
}

function initials(a: Attendee): string {
  const fn = (a.firstName ?? "").trim();
  const ln = (a.lastName ?? "").trim();
  if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (fn.length >= 2) return fn.slice(0, 2).toUpperCase();
  const e = a.email ?? "?";
  return e.slice(0, 2).toUpperCase();
}

function formatTime(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function CheckInScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { api } = useAuth();
  const routeEventId = route?.params?.eventId;
  const scannedTicketId = route?.params?.scannedTicketId;

  const [eventId, setEventId] = useState<string | null>(() => routeEventId ?? null);
  const [eventName, setEventName] = useState<string>("");
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  const loadContext = useCallback(async () => {
    let eid = routeEventId ?? null;
    if (!eid) {
      try {
        const events = await api.getOrganizerEvents();
        const published = events.filter((e) => e.status === "PUBLISHED");
        const pick = published[0] ?? events[0];
        if (pick) {
          eid = pick.id;
          setEventName(pick.name ?? pick.title ?? "Event");
        }
      } catch {
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }
    if (!eid) {
      setEventId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setEventId(eid);
    try {
      const [ev, types, list] = await Promise.all([
        api.getEvent(eid).catch(() => null as Event | null),
        api.getTicketTypes(eid).catch(() => [] as TicketType[]),
        api.getEventAttendees(eid).catch(() => [] as Attendee[]),
      ]);
      if (ev) setEventName(ev.name ?? ev.title ?? "Event");
      setTicketTypes(types);
      setAttendees(list);
    } catch {
      setAttendees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, routeEventId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadContext();
    }, [loadContext])
  );

  const performCheckIn = useCallback(
    async (id: string) => {
      const trimmed = id.trim();
      if (!UUID_REGEX.test(trimmed)) return;
      setActingId(trimmed);
      try {
        const result: CheckInResult = await api.checkInTicket(trimmed);
        if (result.alreadyCheckedIn) {
          Alert.alert("Already checked in", `${result.attendeeName} – ${result.ticketName}`);
        } else {
          Alert.alert("Checked in", `${result.attendeeName} – ${result.ticketName}`);
        }
        if (eventId) {
          const list = await api.getEventAttendees(eventId);
          setAttendees(list);
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Check-in failed";
        Alert.alert("Check-in failed", msg);
      } finally {
        setActingId(null);
      }
    },
    [api, eventId]
  );

  useFocusEffect(
    useCallback(() => {
      if (scannedTicketId) {
        performCheckIn(scannedTicketId);
        navigation?.setParams?.({ scannedTicketId: undefined });
      }
    }, [scannedTicketId, navigation, performCheckIn])
  );

  const capacity = useMemo(() => sumTicketCapacity(ticketTypes), [ticketTypes]);
  const checkedInCount = useMemo(
    () => attendees.filter((a) => a.checkedIn).length,
    [attendees]
  );
  const effectiveCapacity = capacity > 0 ? capacity : Math.max(attendees.length, 1);
  const pct = Math.min(100, Math.round((checkedInCount / effectiveCapacity) * 100));
  const capacityDisplay =
    capacity > 0 ? capacity.toLocaleString() : attendees.length > 0 ? attendees.length.toLocaleString() : "—";

  const recentVelocity = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    return attendees.filter(
      (a) => a.checkedIn && a.checkedInAt && new Date(a.checkedInAt).getTime() >= cutoff
    ).length;
  }, [attendees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attendees.filter((a) => {
      const name = attendeeName(a).toLowerCase();
      const email = (a.email ?? "").toLowerCase();
      const tid = (a.ticketId ?? "").toLowerCase();
      const matchQ = !q || name.includes(q) || email.includes(q) || tid.includes(q);
      if (!matchQ) return false;
      if (filterTab === "checked") return !!a.checkedIn;
      if (filterTab === "pending") return !a.checkedIn;
      return true;
    });
  }, [attendees, query, filterTab]);

  const sortedList = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ta = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
      const tb = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
      return tb - ta;
    });
  }, [filtered]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContext();
  };

  const onCheckInRow = async (tid: string) => {
    if (Platform.OS === "android") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await performCheckIn(tid);
  };

  const handleManualCheckIn = async () => {
    const trimmed = ticketId.trim();
    if (!trimmed) {
      Alert.alert("Error", "Enter a ticket ID");
      return;
    }
    if (!UUID_REGEX.test(trimmed)) {
      Alert.alert("Invalid ID", "Ticket ID should be a UUID (from the QR code).");
      return;
    }
    setManualLoading(true);
    try {
      await performCheckIn(trimmed);
      setTicketId("");
    } finally {
      setManualLoading(false);
    }
  };

  const header = (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View style={styles.topBar}>
        <TouchableOpacity
          hitSlop={12}
          onPress={() => (navigation?.canGoBack?.() ? navigation.goBack() : navigation?.navigate("OrganizerDashboard"))}
        >
          <Ionicons name="menu" size={26} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Event Check-in</Text>
        <TouchableOpacity hitSlop={12} onPress={() => navigation?.navigate("QRScanner", { eventId: eventId ?? undefined })}>
          <Ionicons name="qr-code-outline" size={26} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      {eventName ? (
        <Text style={[styles.eventSubtitle, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
          {eventName}
        </Text>
      ) : null}

      {/* Live attendance */}
      <View style={styles.liveCard}>
        <View style={styles.liveCardTop}>
          <Text style={styles.liveLabel}>LIVE ATTENDANCE</Text>
          <View style={styles.capacityPill}>
            <Text style={styles.capacityPillText}>{pct}% Capacity</Text>
          </View>
        </View>
        <Text style={styles.liveStat}>
          {checkedInCount.toLocaleString()} / {capacityDisplay}
        </Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.trendRow}>
          <Ionicons name="trending-up" size={16} color="rgba(255,255,255,0.95)" />
          <Text style={styles.trendText}>
            {recentVelocity > 0 ? `+${recentVelocity} in last 5m` : "No check-ins in last 5m"}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: PURPLE + "14" }]}>
        <Ionicons name="search" size={20} color={PURPLE} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.foreground }]}
          placeholder="Search attendee or ticket ID..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Filter chips */}
      <View style={styles.chipRow}>
        {(
          [
            { id: "all" as const, label: "All Guests" },
            { id: "checked" as const, label: "Checked In" },
            { id: "pending" as const, label: "Not Arrived" },
          ] as const
        ).map(({ id, label }) => {
          const active = filterTab === id;
          return (
            <TouchableOpacity
              key={id}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              onPress={() => setFilterTab(id)}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Arrivals</Text>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>Live</Text>
        </View>
      </View>

      {/* Manual entry (collapsed) */}
      <TouchableOpacity style={styles.manualToggle} onPress={() => setManualOpen(!manualOpen)}>
        <Text style={{ color: PURPLE, fontWeight: "600", fontSize: 14 }}>
          {manualOpen ? "Hide manual ticket ID" : "Enter ticket ID manually"}
        </Text>
        <Ionicons name={manualOpen ? "chevron-up" : "chevron-down"} size={20} color={PURPLE} />
      </TouchableOpacity>
      {manualOpen && (
        <View style={[editorialCard(theme), { padding: 16, marginBottom: 12 }]}>
          <TextInput
            style={[
              styles.manualInput,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.background, color: theme.colors.foreground },
            ]}
            placeholder="Paste ticket UUID"
            placeholderTextColor={theme.colors.mutedForeground}
            value={ticketId}
            onChangeText={setTicketId}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.manualBtn, { backgroundColor: PURPLE }, manualLoading && { opacity: 0.7 }]}
            onPress={handleManualCheckIn}
            disabled={manualLoading}
          >
            {manualLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.manualBtnText}>Check in</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item: a }: { item: Attendee }) => {
    const name = attendeeName(a);
    const ticketLabel = (a.ticketType ?? "General").toUpperCase();
    const busy = actingId === a.ticketId;

    return (
      <View style={[editorialCard(theme), styles.guestCard]}>
        <View style={styles.guestRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(a)}</Text>
          </View>
          <View style={styles.guestMain}>
            <Text style={[styles.guestName, { color: theme.colors.foreground }]}>{name}</Text>
            <Text style={[styles.guestTicket, { color: theme.colors.mutedForeground }]}>{ticketLabel}</Text>
          </View>
          {a.checkedIn ? (
            <View style={styles.checkedCol}>
              <Ionicons name="checkmark-circle" size={22} color={PURPLE} />
              <Text style={styles.checkedLbl}>CHECKED-IN</Text>
              <Text style={styles.checkedTime}>{formatTime(a.checkedInAt)}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.checkInBtn, { backgroundColor: PURPLE }]}
              onPress={() => onCheckInRow(a.ticketId)}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.checkInBtnText}>Check In</Text>}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading && !attendees.length) {
    return (
      <View style={[styles.centered, { backgroundColor: BG, paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={{ marginTop: 12, color: theme.colors.mutedForeground }}>Loading check-in…</Text>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={[styles.centered, { backgroundColor: BG, paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Ionicons name="calendar-outline" size={48} color={PURPLE} />
        <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No event selected</Text>
        <Text style={{ textAlign: "center", color: theme.colors.mutedForeground, marginBottom: 20 }}>
          Open check-in from an event, or create and publish an event first.
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: PURPLE }]} onPress={() => navigation?.navigate("OrganizerDashboard")}>
          <Text style={styles.primaryBtnText}>Back to organizer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <FlatList
        data={sortedList}
        keyExtractor={(item) => item.ticketId}
        renderItem={renderItem}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        contentContainerStyle={{ paddingHorizontal: lightTheme.spacing.md, paddingBottom: insets.bottom + 120 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", color: theme.colors.mutedForeground, paddingVertical: 24 }}>
            No guests match this filter.
          </Text>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 72 }]}
        onPress={() => navigation?.navigate("QRScanner", { eventId })}
        activeOpacity={0.9}
      >
        <Ionicons name="qr-code" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.navItemActive}>
          <Ionicons name="people" size={22} color={PURPLE} />
          <Text style={styles.navLabelActive}>Attendees</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation?.navigate("QRScanner", { eventId })}>
          <Ionicons name="scan-outline" size={22} color="#6b5b7a" />
          <Text style={styles.navLabel}>Scanner</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation?.navigate("EventTickets", { eventId })}
        >
          <Ionicons name="bar-chart-outline" size={22} color="#6b5b7a" />
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation?.navigate("OrganizerDashboard")}>
          <Ionicons name="settings-outline" size={22} color="#6b5b7a" />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  pageTitle: { fontSize: 18, fontWeight: "800", color: "#0A0A0A" },
  eventSubtitle: { fontSize: 13, marginBottom: 14, paddingHorizontal: 2 },
  liveCard: {
    backgroundColor: PURPLE,
    borderRadius: lightTheme.radius.lg,
    padding: 18,
    marginBottom: 18,
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  liveCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  liveLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  capacityPill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  capacityPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  liveStat: { color: "#fff", fontSize: 28, fontWeight: "800" },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#fff", borderRadius: 4 },
  trendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  trendText: { color: "rgba(255,255,255,0.95)", fontSize: 13, fontWeight: "600" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: lightTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chipRow: { flexDirection: "row", gap: 10, marginBottom: 18, flexWrap: "wrap" },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999 },
  chipActive: { backgroundColor: PURPLE },
  chipIdle: { backgroundColor: PURPLE + "18" },
  chipText: { fontSize: 13, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  chipTextIdle: { color: "#3d2a5c" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0A0A0A" },
  liveBadge: { backgroundColor: "#fecaca", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  liveBadgeText: { color: "#b91c1c", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  manualToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: lightTheme.radius.md,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  manualBtn: { borderRadius: lightTheme.radius.md, padding: 14, alignItems: "center" },
  manualBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  guestCard: { padding: 14, marginBottom: 10 },
  guestRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: PURPLE + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: PURPLE },
  guestMain: { flex: 1, minWidth: 0 },
  guestName: { fontSize: 16, fontWeight: "700" },
  guestTicket: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginTop: 4 },
  checkedCol: { alignItems: "flex-end" },
  checkedLbl: { fontSize: 10, fontWeight: "800", color: PURPLE, marginTop: 2 },
  checkedTime: { fontSize: 12, color: "#6b5b7a", marginTop: 2 },
  checkInBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: lightTheme.radius.md,
    minWidth: 100,
    alignItems: "center",
  },
  checkInBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  fab: {
    position: "absolute",
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  navItem: { alignItems: "center", paddingHorizontal: 8 },
  navItemActive: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: PURPLE + "18",
  },
  navLabel: { fontSize: 11, color: "#6b5b7a", marginTop: 4, fontWeight: "600" },
  navLabelActive: { fontSize: 11, color: PURPLE, marginTop: 4, fontWeight: "800" },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 8 },
  primaryBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
