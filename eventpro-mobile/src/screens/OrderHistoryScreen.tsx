import React, { useState, useMemo, useLayoutEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  getEventIdFromOrderLineItem,
  getTicketQuantityFromOrderItems,
  parseOrderTimestamp,
  getOrderLineItems,
  resolveOrderEventDate,
  resolveOrderEventEndDate,
  isUpcomingOrder,
  parseApiDateTime,
  type Order,
  type Event,
} from "@eventpro/shared";
import type { Theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
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
  const tickets = getOrderLineItems(raw as { orderItems?: unknown[]; tickets?: unknown[] });
  const rawWhen = raw.createdAt ?? raw.orderDate;
  const createdAt =
    typeof rawWhen === "string"
      ? rawWhen
      : parseOrderTimestamp(rawWhen) || "";
  let dateLabel = "—";
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) dateLabel = d.toLocaleDateString(undefined, { dateStyle: "long" });
  }
  const rawStatus = String(raw.status ?? "").toUpperCase();
  const status =
    rawStatus === "PAID" || rawStatus === "SUCCESS" || rawStatus === "FULFILLED"
      ? "COMPLETED"
      : rawStatus === "PENDING"
        ? "PENDING"
        : rawStatus === "CANCELLED"
          ? "CANCELLED"
          : rawStatus === "REFUNDED"
            ? "REFUNDED"
            : rawStatus === "COMPLETED"
              ? "COMPLETED"
              : "COMPLETED";
  return {
    id: String(raw.id ?? ""),
    userId: String((raw as { userId?: string }).userId ?? ""),
    totalAmount,
    status: status as Order["status"],
    createdAt,
    tickets,
    _dateLabel: dateLabel,
  } as OrderWithMeta;
}

function getStatusLabel(status: string) {
  const u = (status || "").toUpperCase();
  if (u === "PAID" || u === "SUCCESS" || u === "FULFILLED") return "Paid";
  switch (status) {
    case "COMPLETED": return "Confirmed";
    case "PENDING": return "Pending";
    case "CANCELLED": return "Cancelled";
    case "REFUNDED": return "Refunded";
    default: return status;
  }
}

function isPaidOrCompletedStatus(status: string): boolean {
  const u = (status || "").toUpperCase();
  return u === "COMPLETED" || u === "PAID" || u === "SUCCESS" || u === "FULFILLED";
}

function getStatusColor(status: string) {
  if (isPaidOrCompletedStatus(status)) return "#15803d";
  switch (status) {
    case "PENDING": return "#d97706";
    case "CANCELLED": return "#dc2626";
    case "REFUNDED": return "#6b7280";
    default: return "#6b7280";
  }
}

function getEventImageUrl(event: Event | undefined): string | undefined {
  if (!event) return undefined;
  const url = (event as any).imageUrl ?? (event as any).coverImageUrl;
  return typeof url === "string" ? url : undefined;
}

function daysUntilEvent(d: Date): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((t.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

/** Stitch-style order reference for receipts (not the raw UUID). */
function formatOrderDisplayId(orderId: string): string {
  const compact = orderId.replace(/-/g, "").slice(0, 6).toUpperCase();
  return compact.length >= 5 ? `XP-${compact}` : `XP-${orderId.slice(0, 8).toUpperCase()}`;
}

export function OrderHistoryScreen({ navigation }: { navigation: any }) {
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
  /** Matches web `/orders`: Upcoming vs Past Events */
  const [ticketTab, setTicketTab] = useState<"upcoming" | "past">("upcoming");

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const data = await api.getOrders(1, 50);
          const rawList = Array.isArray(data) ? data : [];
          const normalized = rawList.map((o) => normalizeOrder(o as unknown as Record<string, unknown>)) as OrderWithMeta[];

          const eventIds = new Set<string>();
          normalized.forEach((o) => {
            getOrderLineItems(o).forEach((t) => {
              const eid = getEventIdFromOrderLineItem(t);
              if (eid) eventIds.add(eid);
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
    }, [api])
  );

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

  const visibleOrders = useMemo(
    () => (ticketTab === "upcoming" ? upcoming : past),
    [ticketTab, upcoming, past]
  );

  const onViewTicket = (order: OrderWithMeta) => {
    navigation.navigate("OrderDetail", {
      orderId: order.id,
      eventName: order._event?.name,
    });
  };

  const onPressOrder = (order: OrderWithMeta) => {
    if (order._event?.id) {
      navigation.getParent()?.navigate("Discover", { screen: "EventDetail", params: { eventId: order._event.id } });
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  /** Tickets-first (Stitch my_tickets): no duplicate profile block — use Profile tab. */
  if (orders.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.ticketsHero}>
          <Text style={[styles.ticketsHeroTitle, { color: theme.colors.foreground }]}>My tickets</Text>
          <Text style={[styles.ticketsHeroSub, { color: theme.colors.mutedForeground }]}>
            Purchases and QR codes live here. Open your wallet when you are at the venue.
          </Text>
          <TouchableOpacity
            style={[styles.walletLinkRow, { backgroundColor: theme.colors.primary + "18" }]}
            onPress={() => navigation.navigate("MyWallet")}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={22} color={theme.colors.primary} />
            <Text style={[styles.walletLinkText, { color: theme.colors.primary }]}>Open My Wallet</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="ticket-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No orders yet</Text>
          <Text style={[styles.emptyText, { color: theme.colors.mutedForeground }]}>
            Your order history will appear here after your first purchase. Discover events and grab your tickets.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.getParent()?.navigate("Discover")}
            activeOpacity={0.8}
          >
            <Ionicons name="ticket-outline" size={20} color={theme.colors.primaryForeground} />
            <Text style={[styles.emptyButtonText, { color: theme.colors.primaryForeground }]}>Find Your Next Experience</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const activeBadge = (order: OrderWithMeta) => {
    if (!order._eventDate) return null;
    const du = daysUntilEvent(order._eventDate);
    if (du === 0) return "TONIGHT";
    if (du > 0 && du <= 14) return `IN ${du} DAY${du === 1 ? "" : "S"}`;
    return null;
  };

  const renderOrderCard = (order: OrderWithMeta, isFeatured: boolean, cardWidth?: number) => {
    const event = order._event;
    const eventDate = order._eventDate;
    const eventImageUrl = getEventImageUrl(event);
    const orderDateLabel = order._dateLabel ?? "—";
    const eventDateLabel = eventDate
      ? eventDate.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })
      : null;
    const ticketCount = getTicketQuantityFromOrderItems(order.tickets as unknown[] | undefined);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
          isFeatured && styles.cardFeatured,
          cardWidth != null ? { width: cardWidth } : null,
        ]}
        onPress={() => onPressOrder(order)}
        activeOpacity={0.8}
      >
        <View style={[styles.cardImageWrap, isFeatured && styles.cardImageWrapFeatured]}>
          {eventImageUrl ? (
            <Image source={{ uri: eventImageUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: theme.colors.muted }]}>
              <Ionicons name="ticket-outline" size={40} color={theme.colors.primary} />
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={[styles.orderId, { color: theme.colors.mutedForeground }]}>
              {formatOrderDisplayId(order.id)}
            </Text>
            <View style={[styles.badge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.badgeText}>{getStatusLabel(order.status)}</Text>
            </View>
          </View>
          <Text style={[styles.eventName, { color: theme.colors.foreground }]} numberOfLines={2}>
            {event?.name ?? "Event"}
          </Text>
          {eventDateLabel ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.eventDate, { color: theme.colors.foreground }]}>{eventDateLabel}</Text>
            </View>
          ) : null}
          <Text style={[styles.orderDate, { color: theme.colors.mutedForeground }]}>
            Ordered {orderDateLabel}
          </Text>
          <View style={styles.cardFooter}>
            <View style={styles.amountRow}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.amount, { color: theme.colors.foreground }]}>
                ${Number(order.totalAmount ?? 0).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.ticketCount, { color: theme.colors.mutedForeground }]}>
              {ticketCount} ticket{ticketCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.viewTicketBtn, { backgroundColor: theme.colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              onViewTicket(order);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={18} color={theme.colors.primaryForeground} />
            <Text style={[styles.viewTicketBtnText, { color: theme.colors.primaryForeground }]}>View Ticket</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.ticketsHero}>
        <Text style={[styles.ticketsHeroTitle, { color: theme.colors.foreground }]}>My tickets</Text>
        <Text style={[styles.ticketsHeroSub, { color: theme.colors.mutedForeground }]}>
          Same as the web: switch between upcoming and past ticket purchases.
        </Text>
        <TouchableOpacity
          style={[styles.walletLinkRow, { backgroundColor: theme.colors.primary + "18" }]}
          onPress={() => navigation.navigate("MyWallet")}
          activeOpacity={0.85}
        >
          <Ionicons name="wallet-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.walletLinkText, { color: theme.colors.primary }]}>My Wallet — QR & passes</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.colors.muted }]}>
        <TouchableOpacity
          style={[styles.tabChip, ticketTab === "upcoming" && { backgroundColor: theme.colors.card }]}
          onPress={() => setTicketTab("upcoming")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabChipText,
              { color: ticketTab === "upcoming" ? theme.colors.foreground : theme.colors.mutedForeground },
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabChip, ticketTab === "past" && { backgroundColor: theme.colors.card }]}
          onPress={() => setTicketTab("past")}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.tabChipText,
              { color: ticketTab === "past" ? theme.colors.foreground : theme.colors.mutedForeground },
            ]}
          >
            Past events
          </Text>
        </TouchableOpacity>
      </View>

      {visibleOrders.length === 0 ? (
        <View style={[styles.tabEmpty, { borderColor: theme.colors.border }]}>
          <Ionicons name="ticket-outline" size={28} color={theme.colors.mutedForeground} />
          <Text style={[styles.tabEmptyText, { color: theme.colors.mutedForeground }]}>
            No {ticketTab === "upcoming" ? "upcoming" : "past"} tickets in this view.
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          {visibleOrders.map((order) => (
            <View key={order.id} style={styles.cardWrap}>
              <View style={styles.activeWrap}>
                {ticketTab === "upcoming" && activeBadge(order) ? (
                  <View style={styles.tonightBadge}>
                    <Text style={styles.tonightBadgeText}>{activeBadge(order)}</Text>
                  </View>
                ) : null}
                {renderOrderCard(order, ticketTab === "upcoming")}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    pageSubtitle: { fontSize: 15, marginBottom: theme.spacing.lg },
    ticketsHero: { marginBottom: theme.spacing.lg },
    ticketsHeroTitle: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
    ticketsHeroSub: { fontSize: 14, lineHeight: 20, marginBottom: 14 },
    walletLinkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: theme.radius.lg,
    },
    walletLinkText: { flex: 1, fontSize: 15, fontWeight: "700" },
    tabBar: {
      flexDirection: "row",
      alignSelf: "flex-start",
      borderRadius: theme.radius.full,
      padding: 4,
      marginBottom: theme.spacing.lg,
      gap: 4,
    },
    tabChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: theme.radius.full,
    },
    tabChipText: { fontSize: 14, fontWeight: "700" },
    tabEmpty: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 20,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.lg,
    },
    tabEmptyText: { flex: 1, fontSize: 15, lineHeight: 22 },
    activeWrap: { position: "relative" },
    tonightBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      zIndex: 2,
      backgroundColor: "#8B2942",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radius.sm,
    },
    tonightBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
    section: { marginBottom: theme.spacing.lg },
    sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    sectionBar: { width: 4, height: 24, borderRadius: 2, marginRight: 8 },
    sectionTitle: { fontSize: 20, fontWeight: "700" },
    sectionTitlePast: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
    cardWrap: { marginBottom: 16 },
    card: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    cardFeatured: {
      borderColor: theme.colors.primary,
      borderWidth: 1.5,
    },
    cardImageWrap: { height: 120, width: "100%" },
    cardImageWrapFeatured: { height: 140 },
    cardImage: { width: "100%", height: "100%" },
    cardImagePlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
    cardBody: { padding: theme.spacing.md },
    cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
    orderId: { fontSize: 13, fontWeight: "600", fontFamily: "monospace" },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.md },
    badgeText: { fontSize: 12, fontWeight: "600", color: "#fff" },
    eventName: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
    eventDate: { fontSize: 14, fontWeight: "500" },
    orderDate: { fontSize: 12, marginBottom: 8 },
    cardFooter: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    amountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    amount: { fontSize: 18, fontWeight: "700" },
    ticketCount: { fontSize: 14 },
    viewTicketBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: theme.radius.md,
    },
    viewTicketBtnText: { fontSize: 15, fontWeight: "600" },
    emptyCard: {
      width: "100%",
      maxWidth: 400,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      padding: theme.spacing.xl,
      alignItems: "center",
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: theme.spacing.lg,
    },
    emptyTitle: { fontSize: 22, fontWeight: "700", marginBottom: 8, textAlign: "center" },
    emptyText: {
      fontSize: 15,
      color: theme.colors.mutedForeground,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    emptyButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: theme.radius.md,
    },
    emptyButtonText: { fontSize: 16, fontWeight: "600" },
  });
}
