import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../contexts/CartContext";
import type { Event, TicketType } from "@eventpro/shared";
import { formatTicketTypeName, isEventEnded } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";

const PURPLE = "#6344D4";
const BG = "#F9F5FF";

function tierFeatures(t: TicketType): { text: string; star?: boolean }[] {
  const name = formatTicketTypeName(t.name).toLowerCase();
  if (name.includes("vip") || name.includes("premium")) {
    return [
      { text: "Fast-track entry", star: true },
      { text: "VIP lounge access", star: true },
      { text: "Premium bar", star: true },
      { text: "Exclusive viewing area", star: true },
    ];
  }
  return [
    { text: "General Admission access" },
    { text: "Standard bar access" },
  ];
}

export function SelectTicketsScreen({
  route,
  navigation,
}: {
  route: { params: { eventId: string } };
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { api } = useAuth();
  const { addItem: addToCart } = useCart();
  const { eventId } = route.params;

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [hasSeatMap, setHasSeatMap] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ev, types, seats] = await Promise.all([
          api.getEvent(eventId),
          api.getTicketTypes(eventId),
          api.getEventSeats(eventId).catch(() => []),
        ]);
        if (!cancelled) {
          setEvent(ev);
          setTicketTypes(types ?? []);
          setHasSeatMap(Boolean(ev?.reservedSeatingEnabled && Array.isArray(seats) && seats.length > 0));
        }
      } catch {
        if (!cancelled) {
          setEvent(null);
          setTicketTypes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, eventId]);

  const setQty = (ticketId: string, delta: number) => {
    const t = ticketTypes.find((x) => x.id === ticketId);
    if (!t) return;
    setQuantities((prev) => {
      const next = (prev[ticketId] ?? 0) + delta;
      const max = Math.min(4, t.availableQuantity ?? t.totalQuantity ?? 4);
      const clamped = Math.max(0, Math.min(next, max));
      return { ...prev, [ticketId]: clamped };
    });
  };

  const totalCents = ticketTypes.reduce((sum, t) => {
    const q = quantities[t.id] ?? 0;
    return sum + q * Number(t.price) * 100;
  }, 0);
  const totalFormatted = `$${(totalCents / 100).toFixed(2)}`;
  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
  const eventEnded = event ? isEventEnded(event) : false;
  const canContinue = totalQty > 0 && !eventEnded;

  const startTime = event?.startTime ?? (event as { startDateTime?: string } | null)?.startDateTime;
  const imageUrl = (event as { imageUrl?: string } | null)?.imageUrl;
  const locationLine = [(event as { venue?: string } | null)?.venue, event?.addressCity, event?.addressState].filter(Boolean).join(", ");

  const onContinue = async () => {
    if (!canContinue || !event || eventEnded) return;
    setAdding(true);
    try {
      for (const t of ticketTypes) {
        const qty = quantities[t.id] ?? 0;
        if (qty > 0) {
          await addToCart({
            ticketTypeId: t.id,
            ticketTypeName: formatTicketTypeName(t.name),
            eventName: event.name,
            eventId: event.id,
            quantity: qty,
            price: Number(t.price),
          });
        }
      }
      navigation.navigate("Checkout", { eventId: event.id });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centered, { backgroundColor: BG }]}>
        <Text style={{ color: theme.colors.mutedForeground }}>Event not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: PURPLE, fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Select Tickets</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="ellipsis-vertical" size={22} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.eventCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.colors.muted }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.name}
            </Text>
            {startTime ? (
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={PURPLE} />
                <Text style={styles.metaText}>
                  {new Date(startTime).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                  {new Date(startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            ) : null}
            {locationLine ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={PURPLE} />
                <Text style={styles.metaText} numberOfLines={2}>
                  {locationLine}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {eventEnded ? (
          <View style={[styles.endedBanner, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
            <Text style={[styles.endedText, { color: theme.colors.mutedForeground }]}>
              This event has ended. Ticket sales are closed.
            </Text>
          </View>
        ) : (
        <>
        <View style={styles.availRow}>
          <Text style={styles.availTitle}>Available Tickets</Text>
          <Text style={styles.availCount}>{ticketTypes.length} TYPES</Text>
        </View>

        {ticketTypes.map((t) => {
          const q = quantities[t.id] ?? 0;
          const feats = tierFeatures(t);
          const isVip = formatTicketTypeName(t.name).toLowerCase().includes("vip");
          return (
            <View
              key={t.id}
              style={[styles.ticketCard, { backgroundColor: theme.colors.primary + "12", borderColor: theme.colors.primary + "35" }]}
            >
              <View style={styles.ticketTop}>
                <View style={{ flex: 1 }}>
                  {isVip ? (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>BEST EXPERIENCE</Text>
                    </View>
                  ) : null}
                  <Text style={styles.tierName}>{formatTicketTypeName(t.name)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.price}>${Number(t.price).toFixed(2)}</Text>
                  <Text style={styles.inclFees}>INCL. FEES</Text>
                </View>
              </View>
              <Text style={styles.tierSub}>{isVip ? "Premium access & perks" : "Access for 1 person"}</Text>
              {feats.map((f) => (
                <View key={f.text} style={styles.featRow}>
                  <Ionicons name={f.star ? "star" : "checkmark-circle"} size={16} color={PURPLE} />
                  <Text style={styles.featText}>{f.text}</Text>
                </View>
              ))}
              <View style={styles.qtyRow}>
                <View style={styles.qtyPill}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(t.id, -1)} disabled={q <= 0}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNum}>{q}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, styles.qtyBtnSolid]}
                    onPress={() => setQty(t.id, 1)}
                    disabled={q >= Math.min(4, t.availableQuantity ?? t.totalQuantity ?? 4)}
                  >
                    <Text style={styles.qtyBtnSolidText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={18} color={PURPLE} />
          <Text style={styles.infoBannerText} numberOfLines={2}>
            Tickets are non-refundable but can be transferred per organizer policy.
          </Text>
        </View>

        {hasSeatMap && !eventEnded ? (
          <TouchableOpacity
            style={[styles.seatMapCta, { borderColor: PURPLE }]}
            onPress={() =>
              navigation.navigate("SelectSeats", {
                eventId: event.id,
                eventName: event.name,
                imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
                startTime: startTime ?? undefined,
              })
            }
          >
            <Ionicons name="map-outline" size={20} color={PURPLE} />
            <Text style={[styles.seatMapCtaText, { color: PURPLE }]}>Choose seats on map</Text>
          </TouchableOpacity>
        ) : null}
        </>
        )}
      </ScrollView>

      <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + 12, backgroundColor: theme.colors.card, borderTopColor: theme.colors.border }]}>
        <View>
          <Text style={styles.totalLbl}>TOTAL PRICE</Text>
          <Text style={styles.totalVal}>{totalFormatted}</Text>
        </View>
        <TouchableOpacity
          style={[styles.cta, { opacity: canContinue && !adding ? 1 : 0.5 }]}
          disabled={!canContinue || adding}
          onPress={onContinue}
        >
          <Text style={styles.ctaText}>{adding ? "…" : "Continue to Checkout"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    root: { flex: 1 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    topTitle: { fontSize: 17, fontWeight: "800", color: "#0A0A0A" },
    eventCard: {
      flexDirection: "row",
      marginHorizontal: 16,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      gap: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 3,
    },
    thumb: { width: 72, height: 72, borderRadius: 12 },
    endedBanner: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
    },
    endedText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
    eventTitle: { fontSize: 16, fontWeight: "800", color: theme.colors.foreground },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
    metaText: { fontSize: 12, color: theme.colors.mutedForeground, flex: 1 },
    availRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 20,
      marginBottom: 12,
    },
    availTitle: { fontSize: 18, fontWeight: "900", color: "#0A0A0A" },
    availCount: { fontSize: 12, fontWeight: "800", color: "#9d174d" },
    ticketCard: {
      marginHorizontal: 16,
      marginBottom: 14,
      padding: 16,
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
    },
    bestBadge: {
      alignSelf: "flex-start",
      backgroundColor: "#c026d3",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      marginBottom: 6,
    },
    bestBadgeText: { fontSize: 9, fontWeight: "900", color: "#fff" },
    ticketTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    tierName: { fontSize: 17, fontWeight: "800", color: theme.colors.foreground },
    price: { fontSize: 18, fontWeight: "900", color: theme.colors.foreground },
    inclFees: { fontSize: 9, fontWeight: "700", color: theme.colors.mutedForeground, marginTop: 2 },
    tierSub: { fontSize: 13, color: theme.colors.mutedForeground, marginTop: 6, marginBottom: 10 },
    featRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    featText: { fontSize: 13, color: theme.colors.foreground },
    qtyRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
    qtyPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 999, padding: 4, gap: 4 },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary + "18", justifyContent: "center", alignItems: "center" },
    qtyBtnText: { fontSize: 20, fontWeight: "700", color: PURPLE },
    qtyNum: { fontSize: 16, fontWeight: "800", minWidth: 28, textAlign: "center", color: theme.colors.foreground },
    qtyBtnSolid: { backgroundColor: PURPLE },
    qtyBtnSolidText: { fontSize: 20, fontWeight: "700", color: "#fff" },
    infoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginHorizontal: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + "14",
    },
    infoBannerText: { flex: 1, fontSize: 12, color: theme.colors.foreground },
    seatMapCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 2,
    },
    seatMapCtaText: { fontSize: 15, fontWeight: "700" },
    checkoutBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 10,
    },
    totalLbl: { fontSize: 10, fontWeight: "800", color: theme.colors.mutedForeground, letterSpacing: 0.5 },
    totalVal: { fontSize: 22, fontWeight: "900", color: theme.colors.foreground },
    cta: {
      backgroundColor: PURPLE,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 16,
      minWidth: 200,
      alignItems: "center",
    },
    ctaText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  });
}
