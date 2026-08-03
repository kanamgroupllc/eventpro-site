import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  Image,
} from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { Event, OrganizerSummary, OrganizerInsights, RecentSale } from "@eventpro/shared";
import { lightTheme } from "../theme";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";
import { canUseAddons, tierLabel } from "../lib/organizerTiers";

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:5173";

export function OrganizerDashboardScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { api, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [requestingPayout, setRequestingPayout] = useState(false);

  const showEnhance = canUseAddons(user?.subscriptionTier);
  const tier = tierLabel(user?.subscriptionTier);

  const load = useCallback(async () => {
    try {
      const [eventList, summaryData, sales, insightsData] = await Promise.all([
        api.getOrganizerEvents(),
        api.getOrganizerSummary().catch(() => null),
        api.getOrganizerRecentSales(10).catch(() => []),
        api.getOrganizerInsights().catch(() => null),
      ]);
      setEvents(Array.isArray(eventList) ? eventList : []);
      setSummary(summaryData ?? null);
      setRecentSales(Array.isArray(sales) ? sales : []);
      setInsights(insightsData ?? null);
    } catch {
      setEvents([]);
      setSummary(null);
      setRecentSales([]);
      setInsights(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePublish = async (eventId: string) => {
    try {
      setPublishingId(eventId);
      await api.publishEvent(eventId);
      await load();
      Alert.alert("Success", "Event published.");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to publish event.");
    } finally {
      setPublishingId(null);
    }
  };

  const openCreateEvent = () => {
    navigation.navigate("CreateEventWizard");
  };

  const openWebOrganizer = (path = "/organizer") => {
    Linking.openURL(`${WEB_URL}${path}`).catch(() => {});
  };

  const handleRequestPayout = async () => {
    if (!summary) return;
    const available = Number(summary.availableBalance) || 0;
    if (available <= 0) return;
    setRequestingPayout(true);
    try {
      await api.requestPayout(available);
      Alert.alert("Success", "Payout requested. You will be notified when it is processed.");
      load();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Request failed");
    } finally {
      setRequestingPayout(false);
    }
  };

  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  if (!isOrganizer) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.message, { color: theme.colors.mutedForeground }]}>
          Organizer access required. Use the web app to create events.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const draftEvents = events.filter((e) => e.status === "DRAFT");
  const publishedEvents = events.filter((e) => e.status === "PUBLISHED");
  const totalRevenue = summary ? Number(summary.totalRevenue) || 0 : 0;
  const availableBalance = summary ? Number(summary.availableBalance) || 0 : 0;
  const pendingBalance = summary ? Number(summary.pendingBalance) || 0 : 0;
  const platformFeesWithheld = summary ? Number(summary.platformFeesWithheld) || 0 : 0;
  const w9Submitted = Boolean(summary?.w9Submitted);
  const isVerified = Boolean(user?.isVerified) || user?.verificationStatus === "VERIFIED";
  const payoutsPausedByTax = totalRevenue >= 600 && !w9Submitted;
  const canPayout = isVerified && availableBalance > 0 && !payoutsPausedByTax;

  const trendPct =
    summary?.ticketsSoldTrendPercent != null && !Number.isNaN(Number(summary.ticketsSoldTrendPercent))
      ? Number(summary.ticketsSoldTrendPercent)
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      {/* Stitch — top bar + revenue hero */}
      <View style={styles.stitchTop}>
        <TouchableOpacity accessibilityRole="button" hitSlop={12} onPress={() => openWebOrganizer("/organizer")}>
          <Ionicons name="menu" size={24} color={theme.colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.stitchBrand, { color: theme.colors.foreground }]}>KanamEvents</Text>
        <TouchableOpacity onPress={() => openWebOrganizer("/profile")}>
          <View style={[styles.stitchAvatar, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="person" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={[styles.revenueHero, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.revenueHeroEyebrow}>TOTAL REVENUE</Text>
        <Text style={styles.revenueHeroValue}>{USD.format(totalRevenue)}</Text>
        <TouchableOpacity
          style={styles.revenueHeroBtn}
          onPress={handleRequestPayout}
          disabled={!canPayout || requestingPayout}
        >
          {requestingPayout ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.revenueHeroBtnText, { color: theme.colors.primary }]}>Request Payout</Text>
          )}
        </TouchableOpacity>
        <View style={styles.trendPill}>
          <Ionicons
            name={trendPct != null && trendPct < 0 ? "trending-down" : "trending-up"}
            size={14}
            color="#fff"
          />
          <Text style={styles.trendPillText}>
            {trendPct != null
              ? `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}% vs last month`
              : "Ticket trend when data is available"}
          </Text>
        </View>
      </View>

      <View style={styles.quickStatsRow}>
        <View style={[editorialCard(theme), styles.quickStat]}>
          <Ionicons name="ticket" size={20} color={theme.colors.primary} />
          <Text style={[styles.quickStatLabel, { color: theme.colors.mutedForeground }]}>Tickets Sold</Text>
          <Text style={[styles.quickStatValue, { color: theme.colors.foreground }]}>
            {(summary?.ticketsSold ?? 0).toLocaleString()}
          </Text>
        </View>
        <View style={[editorialCard(theme), styles.quickStat]}>
          <Ionicons name="eye" size={20} color={theme.colors.primary} />
          <Text style={[styles.quickStatLabel, { color: theme.colors.mutedForeground }]}>Page views</Text>
          <Text style={[styles.quickStatValue, { color: theme.colors.mutedForeground }]}>—</Text>
          <Text style={[styles.quickStatLabel, { color: theme.colors.mutedForeground, fontSize: 10, marginTop: 2 }]}>
            On web
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[editorialCard(theme), styles.insightsShortcut]}
        onPress={() => navigation.navigate("OrganizerEventInsights")}
        activeOpacity={0.9}
      >
        <Ionicons name="analytics-outline" size={24} color={theme.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.seatMapTitle, { color: theme.colors.foreground }]}>Event insights</Text>
          <Text style={[styles.seatMapSub, { color: theme.colors.mutedForeground }]}>
            Pulses, recent sales, AI tips — full financials on web
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[editorialCard(theme), styles.seatMapRow]}
        onPress={() => navigation.navigate("SeatMapEditor")}
        activeOpacity={0.9}
      >
        <Ionicons name="grid-outline" size={24} color={theme.colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.seatMapTitle, { color: theme.colors.foreground }]}>Seat map editor</Text>
          <Text style={[styles.seatMapSub, { color: theme.colors.mutedForeground }]}>
            Pick an event and define sections — or use the web app for the full canvas
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.colors.mutedForeground} />
      </TouchableOpacity>

      {insights?.eventPulses && insights.eventPulses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Event Pulses</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {insights.eventPulses.map((p) => (
              <View key={p.eventId} style={[editorialCard(theme), styles.pulseCard]}>
                <Ionicons name="flash" size={22} color={theme.colors.primary} />
                <Text numberOfLines={1} style={{ fontWeight: "700", color: theme.colors.foreground }}>
                  {p.eventName}
                </Text>
                <Text numberOfLines={3} style={{ fontSize: 13, color: theme.colors.mutedForeground }}>{p.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Plan & verification */}
      <View style={[editorialCard(theme), styles.tierCard]}>
        <View style={[styles.tierRow, styles.tierRowFirst]}>
          <Text style={[styles.tierLabel, { color: theme.colors.mutedForeground }]}>Plan</Text>
          <Text style={[styles.tierValue, { color: theme.colors.foreground }]}>{tier}</Text>
        </View>
        <View style={[styles.tierRow, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.tierLabel, { color: theme.colors.mutedForeground }]}>Verification</Text>
          <View style={styles.tierRowRight}>
            {isVerified ? (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            ) : (
              <Ionicons name="alert-circle-outline" size={20} color={theme.colors.warning} />
            )}
            <Text style={[styles.tierValue, { color: theme.colors.foreground }]}>{isVerified ? "Verified" : "Complete on web"}</Text>
          </View>
        </View>
      </View>

      {/* Check-in shortcut */}
      <TouchableOpacity
        style={[styles.checkInShortcut, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CheckIn")}
      >
        <Ionicons name="scan-outline" size={28} color={theme.colors.primaryForeground} />
        <View style={styles.checkInShortcutText}>
          <Text style={styles.checkInShortcutTitle}>Check-in tickets</Text>
          <Text style={styles.checkInShortcutHint}>Scan QR codes at the door</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.colors.primaryForeground} />
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[editorialCard(theme), styles.actionBtn]}
          onPress={openCreateEvent}
        >
          <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.actionBtnText, { color: theme.colors.primary }]}>Create event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[editorialCard(theme), styles.actionBtn]}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={22} color={theme.colors.foreground} />
          <Text style={[styles.actionBtnText, { color: theme.colors.foreground }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Balances — compact (revenue + payout live in hero) */}
      <View style={[editorialCard(theme), styles.balanceRow]}>
        <View style={styles.balanceCol}>
          <Text style={[styles.balanceLabel, { color: theme.colors.mutedForeground }]}>Available</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.primary }]}>{USD.format(availableBalance)}</Text>
        </View>
        <View style={[styles.balanceDivider, { backgroundColor: theme.colors.border }]} />
        <View style={styles.balanceCol}>
          <Text style={[styles.balanceLabel, { color: theme.colors.mutedForeground }]}>Pending</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.foreground }]}>{USD.format(pendingBalance)}</Text>
        </View>
        {platformFeesWithheld > 0 && (
          <>
            <View style={[styles.balanceDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.balanceCol}>
              <Text style={[styles.balanceLabel, { color: theme.colors.mutedForeground }]}>Fees</Text>
              <Text style={[styles.balanceValue, { color: theme.colors.mutedForeground }]}>−{USD.format(platformFeesWithheld)}</Text>
            </View>
          </>
        )}
      </View>

      {/* AI Insights & Top Cultural Interests – same as web */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.financialHubIconWrap, { backgroundColor: theme.colors.primary + "22" }]}>
            <Ionicons name="sparkles" size={22} color={theme.colors.primary} />
          </View>
          <Text style={[styles.financialHubTitle, { color: theme.colors.foreground }]}>AI Insights</Text>
        </View>
        <View style={[editorialCard(theme), styles.insightCard, { borderColor: theme.colors.primary + "30" }]}>
          <Text style={[styles.insightLabel, { color: theme.colors.primary }]}>AI Insight</Text>
          <Text style={[styles.insightText, { color: theme.colors.foreground }]}>
            {insights?.aiInsight?.trim() || "Create and publish events to see AI-powered tips here."}
          </Text>
        </View>
        <View style={[editorialCard(theme), styles.culturalCard]}>
          <Text style={[styles.culturalTitle, { color: theme.colors.foreground }]}>Top Cultural Interests</Text>
          {(insights?.topCulturalInterests?.length ?? 0) === 0 ? (
            <Text style={[styles.culturalEmpty, { color: theme.colors.mutedForeground }]}>No attendee data yet. Sales will populate this by category.</Text>
          ) : (
            (() => {
              const total = insights!.topCulturalInterests.reduce((s, c) => s + c.count, 0);
              return insights!.topCulturalInterests.slice(0, 6).map((c, i) => {
                const pct = total > 0 ? (c.count / total) * 100 : 0;
                return (
                  <View key={c.name} style={[styles.culturalRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.culturalName, { color: theme.colors.foreground }]} numberOfLines={1}>{c.name}</Text>
                    <View style={[styles.culturalBarBg, { backgroundColor: theme.colors.muted }]}>
                      <View style={[styles.culturalBarFill, { width: `${pct}%`, backgroundColor: theme.colors.primary }]} />
                    </View>
                    <Text style={[styles.culturalCount, { color: theme.colors.mutedForeground }]}>{c.count} ({pct.toFixed(0)}%)</Text>
                  </View>
                );
              });
            })()
          )}
        </View>
      </View>

      {/* 1099-K Tax Center – same as web */}
      <View style={[editorialCard(theme), styles.section, styles.taxSectionInner]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={22} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>1099-K & W-9</Text>
        </View>
        <Text style={[styles.taxDesc, { color: theme.colors.mutedForeground }]}>
          {w9Submitted ? "W-9 on file. Manage documents on the web." : totalRevenue >= 600 ? "W-9 required at $600+ gross. Submit on web to resume payouts." : "Submit W-9 on the web when required."}
        </Text>
        <TouchableOpacity style={[styles.webLinkBtn, { borderColor: theme.colors.border }]} onPress={() => openWebOrganizer("/organizer")}>
          <Text style={[styles.webLinkBtnText, { color: theme.colors.primary }]}>Manage on web</Text>
          <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Export & Insights – same as web */}
      <TouchableOpacity
        style={[editorialCard(theme), styles.webSectionCard]}
        onPress={() => openWebOrganizer("/organizer/financials")}
      >
        <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
        <View style={styles.webSectionText}>
          <Text style={[styles.webSectionTitle, { color: theme.colors.foreground }]}>Financials & exports</Text>
          <Text style={[styles.webSectionHint, { color: theme.colors.mutedForeground }]}>
            Charts, CSV exports, tax center, and full analytics on the web app.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
      </TouchableOpacity>

      {/* Recent sales (Live ticket feed) – same as web */}
      {recentSales.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Recent sales</Text>
          </View>
          <View style={[editorialCard(theme), styles.recentSalesCard]}>
            {recentSales.slice(0, 5).map((sale, i) => (
              <View key={`${sale.orderId}-${i}`} style={[styles.recentSaleRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
                <Text style={[styles.recentSaleEvent, { color: theme.colors.foreground }]} numberOfLines={1}>{sale.eventName}</Text>
                <Text style={[styles.recentSaleDetail, { color: theme.colors.mutedForeground }]}>{sale.quantity} × {sale.ticketTypeName} – {sale.buyerName}</Text>
                <Text style={[styles.recentSaleDate, { color: theme.colors.mutedForeground }]}>{sale.soldAt ? new Date(sale.soldAt).toLocaleString() : ""}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Stats – same as web (Draft, Published, Analytics coming soon) */}
      <View style={styles.statsRow}>
        <View style={[editorialCard(theme), styles.statCard]}>
          <Ionicons name="time-outline" size={24} color="#eab308" />
          <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{draftEvents.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Draft events</Text>
        </View>
        <View style={[editorialCard(theme), styles.statCard]}>
          <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.success} />
          <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{publishedEvents.length}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Published events</Text>
        </View>
        <View style={[editorialCard(theme), styles.statCard]}>
          <Ionicons name="bar-chart-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.statValue, { color: theme.colors.mutedForeground }]}>—</Text>
          <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Analytics (soon)</Text>
        </View>
      </View>

      {/* Draft events */}
      {draftEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={20} color="#eab308" />
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Draft events</Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.muted }]}>
              <Text style={[styles.badgeText, { color: theme.colors.foreground }]}>{draftEvents.length}</Text>
            </View>
          </View>
          {draftEvents.map((event) => (
            <View key={event.id} style={[editorialCard(theme), styles.draftCard]}>
              <View style={styles.draftCardRow}>
                <Ionicons name="time-outline" size={22} color="#eab308" />
                <View style={styles.eventCardMain}>
                  <Text style={[styles.eventName, { color: theme.colors.foreground }]} numberOfLines={2}>{event.name}</Text>
                  <Text style={[styles.eventMeta, { color: theme.colors.mutedForeground }]}>
                    {event.startTime ? new Date(event.startTime).toLocaleDateString() : "No date"}
                  </Text>
                </View>
              </View>
              <View style={styles.eventCardActions}>
                <TouchableOpacity
                  style={[styles.eventCardBtn, { borderColor: theme.colors.border }]}
                  onPress={() => navigation.navigate("OrganizerEventDetail", { eventId: event.id })}
                >
                  <Text style={[styles.eventCardBtnText, { color: theme.colors.foreground }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.publishBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handlePublish(event.id)}
                  disabled={publishingId === event.id}
                >
                  {publishingId === event.id ? (
                    <ActivityIndicator size="small" color={theme.colors.primaryForeground} />
                  ) : (
                    <Text style={[styles.publishBtnText, { color: theme.colors.primaryForeground }]}>Publish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Published events */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.success} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Published events</Text>
          <View style={[styles.badge, { backgroundColor: theme.colors.muted }]}>
            <Text style={[styles.badgeText, { color: theme.colors.foreground }]}>{publishedEvents.length}</Text>
          </View>
        </View>
        {publishedEvents.length === 0 && draftEvents.length === 0 ? (
          <View style={[editorialCard(theme), styles.emptyCard]}>
            <Ionicons name="calendar-outline" size={40} color={theme.colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No events yet</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.mutedForeground }]}>Create your first event on the web app.</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]} onPress={openCreateEvent}>
              <Text style={[styles.emptyBtnText, { color: theme.colors.primaryForeground }]}>Create event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          publishedEvents.map((event) => {
            const imageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
            return (
              <TouchableOpacity
                key={event.id}
                style={[editorialCard(theme), styles.eventCard]}
                onPress={() => navigation.navigate("OrganizerEventDetail", { eventId: event.id })}
                activeOpacity={0.7}
              >
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.eventCardThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.eventCardThumb, styles.eventCardThumbPlaceholder, { backgroundColor: theme.colors.muted }]}>
                    <Ionicons name="calendar-outline" size={24} color={theme.colors.mutedForeground} />
                  </View>
                )}
                <View style={styles.cardText}>
                  <Text style={[styles.eventName, { color: theme.colors.foreground }]} numberOfLines={2}>{event.name}</Text>
                  <Text style={[styles.eventMeta, { color: theme.colors.mutedForeground }]}>
                    {event.startTime ? new Date(event.startTime).toLocaleDateString() : ""}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: theme.colors.primary }]}
      onPress={openCreateEvent}
      accessibilityRole="button"
      accessibilityLabel="Create event"
    >
      <Ionicons name="add" size={28} color="#fff" />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.md, paddingBottom: 88 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: lightTheme.spacing.lg },
  message: { textAlign: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: { width: 48, height: 48, borderRadius: lightTheme.radius.lg, justifyContent: "center", alignItems: "center" },
  headerSubtitle: { fontSize: 14 },
  stitchTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  stitchBrand: { fontSize: 20, fontWeight: "800" },
  stitchAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  revenueHero: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  revenueHeroEyebrow: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  revenueHeroValue: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, marginBottom: 14 },
  revenueHeroBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: lightTheme.radius.full,
  },
  revenueHeroBtnText: { fontSize: 15, fontWeight: "700" },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: lightTheme.radius.full,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  trendPillText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  quickStatsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  quickStat: { flex: 1, padding: 14, alignItems: "flex-start", gap: 6 },
  quickStatLabel: { fontSize: 12, fontWeight: "600" },
  quickStatValue: { fontSize: 22, fontWeight: "800" },
  insightsShortcut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 16,
  },
  seatMapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 16,
  },
  seatMapTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  seatMapSub: { fontSize: 13, lineHeight: 18 },
  pulseCard: { width: 260, padding: 14, gap: 6 },
  balanceRow: { flexDirection: "row", alignItems: "stretch", padding: 16, marginBottom: 16 },
  balanceCol: { flex: 1, alignItems: "center" },
  balanceDivider: { width: 1, marginVertical: 4 },
  balanceLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  balanceValue: { fontSize: 16, fontWeight: "800" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tierCard: { marginBottom: 16, overflow: "hidden" },
  taxSectionInner: { padding: lightTheme.spacing.md },
  tierRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1 },
  tierRowFirst: { borderTopWidth: 0 },
  tierRowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierLabel: { fontSize: 14 },
  tierValue: { fontSize: 15, fontWeight: "600" },
  checkInShortcut: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: lightTheme.radius.lg,
    marginBottom: 16,
  },
  checkInShortcutText: { flex: 1, marginLeft: 14 },
  checkInShortcutTitle: { fontSize: 17, fontWeight: "700", color: "#fff" },
  checkInShortcutHint: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12 },
  actionBtnText: { fontSize: 15, fontWeight: "600" },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  financialHubIconWrap: { width: 40, height: 40, borderRadius: lightTheme.radius.lg, justifyContent: "center", alignItems: "center" },
  financialHubTitle: { fontSize: 18, fontWeight: "700" },
  financialCardsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  financialCard: {
    flex: 1,
    borderRadius: lightTheme.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  financialCardRevenue: { borderColor: lightTheme.colors.success + "50", shadowColor: lightTheme.colors.success },
  financialCardAvailable: { borderColor: lightTheme.colors.primary + "50", shadowColor: lightTheme.colors.primary },
  financialCardPending: { borderColor: lightTheme.colors.border, shadowColor: lightTheme.colors.mutedForeground },
  financialCardAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  financialCardContent: { padding: 12, paddingLeft: 16 },
  financialCardLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  financialCardHint: { fontSize: 10, marginBottom: 4 },
  financialCardValue: { fontSize: 16, fontWeight: "800" },
  financialCardSub: { fontSize: 10, marginTop: 4 },
  instantPayoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: lightTheme.radius.lg, marginTop: 12 },
  instantPayoutText: { fontSize: 15, fontWeight: "600" },
  insightCard: { padding: 16, marginBottom: 12 },
  insightLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  insightText: { fontSize: 15, lineHeight: 22 },
  culturalCard: { padding: 16 },
  culturalTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  culturalEmpty: { fontSize: 14 },
  culturalRow: { paddingVertical: 10 },
  culturalName: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  culturalBarBg: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  culturalBarFill: { height: "100%", borderRadius: 3 },
  culturalCount: { fontSize: 12 },
  taxDesc: { fontSize: 14, marginBottom: 12 },
  webLinkBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: lightTheme.radius.md, borderWidth: 1 },
  webLinkBtnText: { fontSize: 14, fontWeight: "600" },
  webSectionCard: { flexDirection: "row", alignItems: "center", padding: 16, marginBottom: 20 },
  webSectionText: { flex: 1, marginLeft: 12 },
  webSectionTitle: { fontSize: 16, fontWeight: "600" },
  webSectionHint: { fontSize: 13, marginTop: 2 },
  recentSalesCard: { overflow: "hidden" },
  recentSaleRow: { padding: 12 },
  recentSaleEvent: { fontSize: 15, fontWeight: "600" },
  recentSaleDetail: { fontSize: 13, marginTop: 2 },
  recentSaleDate: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: { flex: 1, padding: 12, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: "center" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: lightTheme.radius.sm },
  badgeText: { fontSize: 12, fontWeight: "600" },
  draftCard: { padding: 16, marginBottom: 12 },
  draftCardRow: { flexDirection: "row", alignItems: "center" },
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
  },
  eventCardThumb: { width: 48, height: 48, borderRadius: lightTheme.radius.md },
  eventCardThumbPlaceholder: { justifyContent: "center", alignItems: "center" },
  eventCardMain: { flex: 1, marginLeft: 12 },
  cardText: { flex: 1, marginLeft: 12 },
  eventName: { fontSize: 17, fontWeight: "600" },
  eventMeta: { fontSize: 13, marginTop: 4 },
  eventCardActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  eventCardBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: lightTheme.radius.md, borderWidth: 1 },
  eventCardBtnText: { fontSize: 14, fontWeight: "600" },
  publishBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: lightTheme.radius.md, minWidth: 90, alignItems: "center" },
  publishBtnText: { fontSize: 14, fontWeight: "600" },
  emptyCard: { padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  emptyDesc: { fontSize: 14, marginBottom: 16, color: lightTheme.colors.mutedForeground },
  emptyBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: lightTheme.radius.md },
  emptyBtnText: { fontSize: 15, fontWeight: "600" },
});
