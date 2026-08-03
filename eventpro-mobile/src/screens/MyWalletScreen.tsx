import React, { useEffect, useState, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getEventIdFromOrderLineItem, getOrderLineItems, getQrCodeFromOrderLineItem, resolveOrderEventDate, resolveOrderEventEndDate, isUpcomingOrder, parseApiDateTime, type Order, type Event } from "@eventpro/shared";
import type { Theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { editorialCard } from "../theme/screenStyles";

type OrderWithMeta = Order & {
  _dateLabel?: string;
  _event?: Event;
  _eventDate?: Date;
  _eventEndDate?: Date;
  _orderDate?: Date;
};

function normalizeOrder(raw: Record<string, unknown>): OrderWithMeta {
  const totalAmount =
    typeof raw.totalAmount === "number"
      ? raw.totalAmount
      : typeof (raw as { amount?: number }).amount === "number"
        ? (raw as { amount: number }).amount / 100
        : 0;
  const tickets = Array.isArray(raw.tickets)
    ? raw.tickets
    : Array.isArray((raw as { orderItems?: unknown }).orderItems)
      ? ((raw as { orderItems: unknown[] }).orderItems as Order["tickets"])
      : [];
  const createdAt = (raw.createdAt ?? (raw as { orderDate?: string }).orderDate) as string | undefined;
  let dateLabel = "—";
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) dateLabel = d.toLocaleDateString(undefined, { dateStyle: "long" });
  }
  return {
    id: String(raw.id ?? ""),
    userId: String((raw as { userId?: string }).userId ?? ""),
    totalAmount,
    status: ((raw.status as Order["status"]) ?? "COMPLETED") as string,
    createdAt: createdAt ?? "",
    tickets,
    _dateLabel: dateLabel,
  } as OrderWithMeta;
}

function getEventImageUrl(event: Event | undefined): string | undefined {
  if (!event) return undefined;
  const url = (event as { imageUrl?: string; coverImageUrl?: string }).imageUrl ?? (event as { coverImageUrl?: string }).coverImageUrl;
  return typeof url === "string" ? url : undefined;
}

function daysUntil(d: Date): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((t.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function MyWalletScreen({ navigation }: { navigation: any }) {
  const { api, user } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email?.split("@")[0] || "Member";

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginRight: 4 }}>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate("Search")}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Search events"
          >
            <Ionicons name="search-outline" size={24} color={theme.colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate("Profile", { screen: "ProfileHome" })}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Profile"
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: theme.colors.primary + "33",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
                {displayName.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, theme.colors.foreground, theme.colors.primary, displayName]);
  const [orders, setOrders] = useState<OrderWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [segment, setSegment] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getOrders(1, 50);
        const rawList = Array.isArray(data) ? data : [];
        const normalized = rawList.map((o) => normalizeOrder(o as unknown as Record<string, unknown>)) as OrderWithMeta[];

        const eventIds = new Set<string>();
        normalized.forEach((o) => {
          getOrderLineItems(o).forEach((t) => {
            const id = getEventIdFromOrderLineItem(t);
            if (id) eventIds.add(id);
          });
        });
        const eventsMap: Record<string, Event> = {};
        await Promise.all(
          Array.from(eventIds).map(async (id) => {
            try {
              const ev = await api.getEvent(id);
              if (!cancelled) eventsMap[id] = ev;
            } catch {
              // ignore
            }
          })
        );

        normalized.forEach((o) => {
          const lineItems = getOrderLineItems(o);
          const firstEventId = getEventIdFromOrderLineItem(lineItems[0]);
          const event = firstEventId ? eventsMap[firstEventId] : undefined;
          o._event = event;
          o._eventDate = resolveOrderEventDate(o, event);
          o._eventEndDate = resolveOrderEventEndDate(o, event);
          o._orderDate = parseApiDateTime(o.createdAt);
        });

        if (!cancelled) setOrders(normalized);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: OrderWithMeta[] = [];
    const pa: OrderWithMeta[] = [];
    orders.forEach((o) => {
      if (isUpcomingOrder(o._eventDate, o._eventEndDate, o.status, now)) up.push(o);
      else pa.push(o);
    });
    up.sort((a, b) => (a._eventDate && b._eventDate ? a._eventDate.getTime() - b._eventDate.getTime() : 0));
    pa.sort((a, b) => (a._eventDate && b._eventDate ? b._eventDate.getTime() - a._eventDate.getTime() : 0));
    return { upcoming: up, past: pa };
  }, [orders]);

  const list = segment === "upcoming" ? upcoming : past;
  const featured = segment === "upcoming" && list.length > 0 ? list[0] : null;
  const others = segment === "upcoming" && featured ? list.slice(1) : list;

  const badgeFor = (order: OrderWithMeta) => {
    if (!order._eventDate) return null;
    const d = daysUntil(order._eventDate);
    if (d === 0) return "TONIGHT";
    if (d > 0 && d <= 7) return `IN ${d} DAY${d === 1 ? "" : "S"}`;
    return null;
  };

  const featuredQr = featured
    ? getOrderLineItems(featured).map(getQrCodeFromOrderLineItem).find(Boolean) ?? null
    : null;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            segment === "upcoming" && { backgroundColor: theme.colors.card },
          ]}
          onPress={() => setSegment("upcoming")}
        >
          <Text style={[styles.segmentText, { color: segment === "upcoming" ? theme.colors.foreground : theme.colors.mutedForeground }]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, segment === "past" && { backgroundColor: theme.colors.card }]}
          onPress={() => setSegment("past")}
        >
          <Text style={[styles.segmentText, { color: segment === "past" ? theme.colors.foreground : theme.colors.mutedForeground }]}>Past</Text>
        </TouchableOpacity>
      </View>

      {featured && (
        <View style={[editorialCard(theme), styles.featured]}>
          <View style={styles.featuredImageWrap}>
            {getEventImageUrl(featured._event) ? (
              <Image source={{ uri: getEventImageUrl(featured._event)! }} style={styles.featuredImage} resizeMode="cover" />
            ) : (
              <View style={[styles.featuredImage, { backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" }]}>
                <Ionicons name="musical-notes" size={40} color={theme.colors.primary} />
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.25)", "rgba(139, 41, 66, 0.9)"]}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>FEATURED</Text>
            </View>
            <Text style={styles.featuredTitle} numberOfLines={2}>
              {featured._event?.name ?? "Event"}
            </Text>
          </View>
          <View style={styles.featuredBody}>
            <View style={styles.featuredMetaCol}>
              <View style={styles.metaLine}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.foreground }]}>
                  {featured._eventDate
                    ? featured._eventDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
                    : "—"}
                </Text>
              </View>
              <View style={styles.metaLine}>
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.metaText, { color: theme.colors.foreground }]}>
                  {featured._event?.startTime
                    ? new Date(featured._event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.qrPreview}>
              {featuredQr ? (
                <Image source={{ uri: featuredQr }} style={styles.qrThumb} resizeMode="contain" />
              ) : (
                <Ionicons name="qr-code" size={36} color={theme.colors.mutedForeground} />
              )}
              <Text style={[styles.qrHint, { color: theme.colors.mutedForeground }]}>Scan at entrance</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() =>
              navigation.navigate("OrderDetail", {
                orderId: featured.id,
                eventName: featured._event?.name,
              })
            }
          >
            <Text style={[styles.primaryBtnText, { color: theme.colors.primaryForeground }]}>View Ticket</Text>
          </TouchableOpacity>
        </View>
      )}

      {list.length === 0 ? (
        <Text style={[styles.emptyHint, { color: theme.colors.mutedForeground }]}>
          No {segment === "upcoming" ? "upcoming" : "past"} tickets yet.
        </Text>
      ) : (
        <>
          {others.length > 0 && (
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Other bookings</Text>
          )}
          {others.map((order) => {
            const img = getEventImageUrl(order._event);
            const b = badgeFor(order);
            const start = order._event?.startTime ? new Date(order._event.startTime) : null;
            const timeStr =
              start && !Number.isNaN(start.getTime())
                ? start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                : null;
            const venue = order._event?.venue?.trim();
            const detailLine = [venue, timeStr].filter(Boolean).join(" • ");
            return (
              <TouchableOpacity
                key={order.id}
                style={[editorialCard(theme), styles.rowCard]}
                onPress={() =>
                  navigation.navigate("OrderDetail", { orderId: order.id, eventName: order._event?.name })
                }
                activeOpacity={0.85}
              >
                {img ? (
                  <Image source={{ uri: img }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" }]}>
                    <Ionicons name="ticket-outline" size={24} color={theme.colors.primary} />
                  </View>
                )}
                <View style={styles.rowBody}>
                  {order._eventDate && (
                    <Text style={styles.rowDate}>
                      {order._eventDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  )}
                  <Text style={[styles.rowTitle, { color: theme.colors.foreground }]} numberOfLines={2}>
                    {order._event?.name ?? "Event"}
                  </Text>
                  {detailLine ? (
                    <Text style={[styles.rowDetail, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
                      {detailLine}
                    </Text>
                  ) : null}
                  {b ? <Text style={styles.rowBadge}>{b}</Text> : null}
                </View>
                <View style={[styles.chevronBtn, { backgroundColor: theme.colors.primary + "18" }]}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: theme.spacing.md, paddingBottom: 32 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    segmentWrap: {
      flexDirection: "row",
      borderRadius: theme.radius.lg,
      padding: 4,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.muted,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: theme.radius.md,
      alignItems: "center",
    },
    segmentText: { fontSize: 15, fontWeight: "600" },
    featured: { overflow: "hidden", marginBottom: theme.spacing.lg, padding: 0 },
    featuredImageWrap: { height: 180, width: "100%", justifyContent: "flex-end", position: "relative" },
    featuredImage: { ...StyleSheet.absoluteFillObject },
    featuredBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: "#8B2942",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.md,
    },
    featuredBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
    featuredTitle: {
      position: "absolute",
      bottom: 12,
      left: 12,
      right: 12,
      color: "#fff",
      fontSize: 22,
      fontWeight: "800",
      textShadowColor: "rgba(0,0,0,0.45)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 6,
    },
    featuredBody: {
      flexDirection: "row",
      padding: theme.spacing.md,
      gap: 12,
      alignItems: "flex-start",
    },
    featuredMetaCol: { flex: 1, gap: 8 },
    metaLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    metaText: { fontSize: 14 },
    qrPreview: {
      width: 88,
      height: 88,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.muted,
      overflow: "hidden",
    },
    qrThumb: { width: 76, height: 76 },
    qrHint: { fontSize: 9, marginTop: 4, textAlign: "center" },
    primaryBtn: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingVertical: 14,
      borderRadius: theme.radius.lg,
      alignItems: "center",
    },
    primaryBtnText: { fontSize: 16, fontWeight: "700" },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    rowCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      marginBottom: 12,
      gap: 12,
    },
    thumb: { width: 72, height: 72, borderRadius: theme.radius.md },
    rowBody: { flex: 1, minWidth: 0 },
    rowDate: { fontSize: 12, fontWeight: "600", color: "#8B2942", marginBottom: 4 },
    rowTitle: { fontSize: 16, fontWeight: "700" },
    rowDetail: { fontSize: 13, marginTop: 2 },
    rowBadge: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 },
    chevronBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyHint: { textAlign: "center", marginTop: 24, fontSize: 15 },
  });
}
