import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Event, SeatResponse } from "@eventpro/shared";
import type { Theme } from "../theme";
import type { SelectSeatsRouteParams } from "../navigation/types";

const PURPLE = "#6347D1";
const PURPLE_DEEP = "#4c1d95";
const TEXT_DARK = "#1D162E";

function isSeatAvailable(status: string): boolean {
  const s = status.toUpperCase();
  return s === "AVAILABLE" || s === "ACTIVE";
}

function seatLabel(seat: SeatResponse): string {
  return `${seat.section} ${seat.row}${seat.seatNumber}`;
}

export function SelectSeatsScreen({
  route,
  navigation,
}: {
  route: { params?: SelectSeatsRouteParams };
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { api } = useAuth();
  const { addItem } = useCart();
  const p = route.params;
  const eventId = p?.eventId ?? "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [seats, setSeats] = useState<SeatResponse[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [adding, setAdding] = useState(false);

  const eventName = event?.name ?? p?.eventName ?? "Event";
  const imageUrl = event?.imageUrl ?? p?.imageUrl;
  const startTime = event?.startTime ?? p?.startTime;

  useEffect(() => {
    if (!eventId) navigation.goBack();
  }, [eventId, navigation]);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ev, seatData] = await Promise.all([
          api.getEvent(eventId),
          api.getEventSeats(eventId).catch(() => []),
        ]);
        if (!cancelled) {
          setEvent(ev);
          setSeats(Array.isArray(seatData) ? seatData : []);
        }
      } catch {
        if (!cancelled) {
          setEvent(null);
          setSeats([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, eventId]);

  const dateLine = useMemo(() => {
    if (!startTime) return "";
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  }, [startTime]);

  const rows = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => set.add(s.row));
    return Array.from(set).sort();
  }, [seats]);

  const toggleSeat = (seat: SeatResponse) => {
    if (!isSeatAvailable(seat.status)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else next.add(seat.id);
      return next;
    });
  };

  const selectRow = (row: string) => {
    const inRow = seats.filter((s) => s.row === row && isSeatAvailable(s.status));
    const allSelected = inRow.every((s) => selected.has(s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) inRow.forEach((s) => next.delete(s.id));
      else inRow.forEach((s) => next.add(s.id));
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const selectedList = useMemo(
    () => seats.filter((s) => selected.has(s.id)).sort((a, b) => seatLabel(a).localeCompare(seatLabel(b))),
    [seats, selected]
  );

  const subtotal = useMemo(() => selectedList.reduce((sum, s) => sum + Number(s.price), 0), [selectedList]);

  const handleContinue = useCallback(async () => {
    if (!event || selectedList.length === 0) return;
    setAdding(true);
    try {
      const results = await Promise.all(
        selectedList.map((seat) =>
          addItem({
            ticketTypeId: seat.id,
            ticketTypeName: `${seat.section} — Row ${seat.row}, Seat ${seat.seatNumber}`,
            eventName: event.name,
            eventId: event.id,
            quantity: 1,
            price: Number(seat.price),
          })
        )
      );
      if (results.some((ok) => !ok)) {
        return;
      }
      navigation.navigate("Checkout", { eventId: event.id });
    } finally {
      setAdding(false);
    }
  }, [addItem, event, navigation, selectedList]);

  if (!eventId) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (seats.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: theme.colors.background, padding: 24 }]}>
        <Ionicons name="map-outline" size={48} color={theme.colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No seat map</Text>
        <Text style={[styles.emptyBody, { color: theme.colors.mutedForeground }]}>
          This event doesn't have reserved seating configured yet.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backBtn, { backgroundColor: PURPLE }]}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={PURPLE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Seats</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 160 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.infoBanner, { backgroundColor: theme.colors.primary + "14" }]}>
          <Ionicons name="information-circle-outline" size={18} color={PURPLE} />
          <Text style={[styles.infoBannerText, { color: theme.colors.foreground }]}>
            Seats are held when added to cart. Complete checkout within 15 minutes.
          </Text>
        </View>

        <View style={[styles.eventCard, { backgroundColor: theme.colors.primary + "14" }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.eventThumb} />
          ) : (
            <View style={[styles.eventThumb, styles.eventThumbPh]}>
              <Ionicons name="musical-notes" size={28} color={PURPLE} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={2}>{eventName}</Text>
            {dateLine ? (
              <View style={styles.eventMetaRow}>
                <Ionicons name="calendar-outline" size={14} color={TEXT_DARK} />
                <Text style={styles.eventMeta}>{dateLine}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.mapCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.legendRow}>
            <LegendDot color="#d8b4fe" label="Available" />
            <LegendDot color={PURPLE} label="Selected" />
            <LegendDot color="#d1d5db" label="Unavailable" />
          </View>
          <Text style={styles.stageLabel}>STAGE FRONT</Text>
          <View style={styles.stageBar} />

          {rows.map((row) => (
            <View key={row} style={styles.rowWrap}>
              <TouchableOpacity style={styles.rowPick} onPress={() => selectRow(row)}>
                <Ionicons name="grid-outline" size={18} color={PURPLE} />
              </TouchableOpacity>
              <Text style={styles.rowLetter}>{row}</Text>
              <View style={styles.seatRow}>
                {seats
                  .filter((s) => s.row === row)
                  .sort((a, b) => a.seatNumber - b.seatNumber)
                  .map((seat) => {
                    const isSel = selected.has(seat.id);
                    const unavailable = !isSeatAvailable(seat.status);
                    const bg = unavailable ? "#e5e7eb" : isSel ? PURPLE : "#ede9fe";
                    return (
                      <TouchableOpacity
                        key={seat.id}
                        style={[styles.seat, { backgroundColor: bg, borderWidth: isSel ? 2 : 0, borderColor: "#fff" }]}
                        onPress={() => toggleSeat(seat)}
                        disabled={unavailable}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.seatLabel, { color: unavailable ? "#9ca3af" : isSel ? "#fff" : PURPLE_DEEP }]}>
                          {seat.seatNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.summaryCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Selected Seats</Text>
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Ionicons name="trash-outline" size={18} color={PURPLE} />
              <Text style={styles.clearText}>CLEAR ALL</Text>
            </TouchableOpacity>
          </View>
          {selectedList.length === 0 ? (
            <Text style={{ color: theme.colors.mutedForeground, marginBottom: 8 }}>Tap seats on the map to select.</Text>
          ) : (
            selectedList.map((s) => (
              <View key={s.id} style={styles.seatLine}>
                <View style={[styles.seatLineIcon, { backgroundColor: theme.colors.primary + "20" }]}>
                  <Text style={{ fontWeight: "800", color: PURPLE, fontSize: 11 }}>{s.row}{s.seatNumber}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seatLinePlace}>{s.section}</Text>
                  <Text style={styles.seatLineDetail}>ROW {s.row}, SEAT {s.seatNumber}</Text>
                </View>
                <Text style={styles.seatLinePrice}>${Number(s.price).toFixed(2)}</Text>
              </View>
            ))
          )}
          <View style={[styles.priceLine, { borderTopColor: theme.colors.border }]}>
            <Text style={styles.priceMuted}>Subtotal ({selectedList.length} tickets)</Text>
            <Text style={styles.priceVal}>${subtotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.continueBtn, { backgroundColor: PURPLE, opacity: selectedList.length > 0 && !adding ? 1 : 0.5 }]}
            onPress={() => void handleContinue()}
            disabled={selectedList.length === 0 || adding}
            activeOpacity={0.92}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="cart-outline" size={22} color="#fff" />
                <Text style={styles.continueText}>Add to cart & checkout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {selectedList.length > 0 && (
        <View style={[styles.stickyConfirm, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View>
            <Text style={styles.stickySmall}>{selectedList.length} SEATS SELECTED</Text>
            <Text style={styles.stickyBig}>${subtotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity onPress={() => void handleContinue()} disabled={adding}>
            <Ionicons name="arrow-forward" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: "600", color: TEXT_DARK }}>{label}</Text>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    emptyTitle: { fontSize: 20, fontWeight: "800", marginTop: 16, marginBottom: 8 },
    emptyBody: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 20 },
    backBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 999 },
    backBtnText: { color: "#fff", fontWeight: "800" },
    scroll: { paddingHorizontal: 16 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: TEXT_DARK },
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
    },
    infoBannerText: { flex: 1, fontSize: 13, lineHeight: 19 },
    eventCard: {
      flexDirection: "row",
      gap: 12,
      padding: 12,
      borderRadius: 20,
      marginBottom: 14,
      alignItems: "center",
    },
    eventThumb: { width: 64, height: 64, borderRadius: 12 },
    eventThumbPh: { backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" },
    eventTitle: { fontSize: 16, fontWeight: "800", color: TEXT_DARK, marginBottom: 6 },
    eventMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    eventMeta: { fontSize: 13, color: theme.colors.mutedForeground },
    mapCard: {
      borderRadius: 24,
      padding: 16,
      marginBottom: 16,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 12, justifyContent: "center" },
    stageLabel: { textAlign: "center", fontSize: 11, fontWeight: "800", color: theme.colors.mutedForeground, letterSpacing: 1 },
    stageBar: { height: 10, backgroundColor: "#e5e7eb", borderRadius: 4, marginVertical: 10 },
    rowWrap: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 },
    rowPick: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.primary + "15" },
    rowLetter: { width: 20, fontWeight: "800", color: TEXT_DARK, fontSize: 15 },
    seatRow: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" },
    seat: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
    seatLabel: { fontSize: 12, fontWeight: "800" },
    summaryCard: {
      borderRadius: 24,
      padding: 16,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 2,
    },
    summaryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    summaryTitle: { fontSize: 18, fontWeight: "800", color: TEXT_DARK },
    clearBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    clearText: { fontSize: 12, fontWeight: "800", color: PURPLE },
    seatLine: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    seatLineIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
    seatLinePlace: { fontSize: 13, fontWeight: "700", color: TEXT_DARK },
    seatLineDetail: { fontSize: 12, color: theme.colors.mutedForeground },
    seatLinePrice: { fontSize: 15, fontWeight: "800", color: TEXT_DARK },
    priceLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
    priceMuted: { color: theme.colors.mutedForeground, fontSize: 14 },
    priceVal: { fontWeight: "600", color: TEXT_DARK },
    continueBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderRadius: 999,
      paddingVertical: 16,
      marginTop: 12,
    },
    continueText: { color: "#fff", fontSize: 16, fontWeight: "800" },
    stickyConfirm: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: PURPLE_DEEP,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 14,
      borderTopWidth: 3,
      borderTopColor: "#22c55e",
    },
    stickySmall: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
    stickyBig: { color: "#fff", fontSize: 20, fontWeight: "900" },
  });
}
