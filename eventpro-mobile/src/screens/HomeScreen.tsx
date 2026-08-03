import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import type { Event } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { EventCard } from "../components/EventCard";
import { DiscoverFeaturedCard } from "../components/DiscoverFeaturedCard";
import { BrandLogo } from "../components/BrandLogo";
import { lightTheme } from "../theme";
import { editorialCard } from "../theme/screenStyles";

/** Stitch discovery chips: maps to API category filters */
const DISCOVER_CHIPS: { id: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; category: string | null }[] = [
  { id: "all", label: "All events", icon: "star", category: null },
  { id: "concerts", label: "Concerts", icon: "musical-notes", category: "Music" },
  { id: "sports", label: "Sports", icon: "basketball", category: "Sports" },
  { id: "tech", label: "Tech", icon: "laptop-outline", category: "Technology" },
];

function getUpcoming(events: Event[], limit: number): Event[] {
  const now = new Date();
  return events
    .filter((e) => {
      const t = e.startTime ?? (e as any).startDateTime;
      return t && new Date(t) >= now;
    })
    .sort((a, b) => {
      const ta = new Date(a.startTime ?? (a as any).startDateTime ?? 0).getTime();
      const tb = new Date(b.startTime ?? (b as any).startDateTime ?? 0).getTime();
      return ta - tb;
    })
    .slice(0, limit);
}

function formatShortMeta(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function TrendingCompactCard({ event, onPress }: { event: Event; onPress: () => void }) {
  const { theme } = useTheme();
  const imageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
  const startRaw = event.startTime ?? (event as any).startDateTime;
  const cat = (event.categoryName ?? (event as any).category ?? "Event").toString();
  const title = event.name ?? (event as any).title ?? "Event";

  return (
    <TouchableOpacity style={styles.compactWrap} onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.compactCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.compactImg} resizeMode="cover" />
        ) : (
          <View style={[styles.compactImg, { backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" }]}>
            <Ionicons name="image-outline" size={32} color={theme.colors.mutedForeground} />
          </View>
        )}
        <View style={styles.compactBody}>
          <Text style={[styles.compactCat, { color: theme.colors.primary }]} numberOfLines={1}>
            {cat.toUpperCase()}
          </Text>
          <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.compactMeta, { color: theme.colors.mutedForeground }]}>{formatShortMeta(startRaw)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function HomeScreen({ navigation }: { navigation: any }) {
  const { api, user, hasRole } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [featuredMinPrice, setFeaturedMinPrice] = useState<number | null>(null);

  const firstName = user?.firstName?.trim();
  const personalized = firstName
    ? `Ready for the night of your life, ${firstName}?`
    : "Ready for the night of your life? Discover what’s on near you.";

  const loadTrending = useCallback(async () => {
    try {
      const events =
        selectedCategory && selectedCategory !== "All"
          ? await api.getEventsByCategory(selectedCategory)
          : await api.getEvents(1, 12);
      setTrendingEvents(Array.isArray(events) ? events.slice(0, 8) : []);
    } catch {
      setTrendingEvents([]);
    } finally {
      setLoadingTrending(false);
    }
  }, [api, selectedCategory]);

  const loadUpcoming = useCallback(async () => {
    try {
      const events = await api.getEvents(1, 50);
      const list = Array.isArray(events) ? events : [];
      setUpcomingEvents(getUpcoming(list, 8));
    } catch {
      setUpcomingEvents([]);
    } finally {
      setLoadingUpcoming(false);
    }
  }, [api]);

  useEffect(() => {
    setLoadingTrending(true);
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    setLoadingUpcoming(true);
    loadUpcoming();
  }, [loadUpcoming]);

  const featured = trendingEvents[0];

  useEffect(() => {
    if (!featured?.id) {
      setFeaturedMinPrice(null);
      return;
    }
    let cancelled = false;
    api
      .getTicketTypes(featured.id)
      .then((types) => {
        if (cancelled || !types?.length) {
          setFeaturedMinPrice(null);
          return;
        }
        setFeaturedMinPrice(Math.min(...types.map((x) => x.price)));
      })
      .catch(() => {
        if (!cancelled) setFeaturedMinPrice(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, featured?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadTrending(), loadUpcoming()]);
    setRefreshing(false);
  };

  const goEventsWithSearch = (q: string) => {
    navigation.navigate("EventsList", { initialQuery: q.trim() });
  };

  const chipMatchesSelection = (category: string | null) => {
    if (category === null) return selectedCategory === null;
    return selectedCategory === category;
  };

  const onChipPress = (category: string | null) => {
    setSelectedCategory(category);
  };

  const isOrganizer = hasRole("ORGANIZER") || hasRole("ADMIN");

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Safe top + Stitch header (discovery_home) */}
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: lightTheme.spacing.md }}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => navigation.navigate("EventsList", { initialQuery: searchInput })}
              hitSlop={12}
              style={styles.topIconBtn}
            >
              <Ionicons name="search" size={22} color={theme.colors.foreground} />
            </TouchableOpacity>
            <BrandLogo size={72} />
            <TouchableOpacity
              onPress={() => navigation.getParent()?.navigate("Profile", { screen: "ProfileHome" })}
              hitSlop={12}
              style={styles.topIconBtn}
            >
              <Ionicons name="person-circle-outline" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* discovery/screen — Discover (no hardcoded city until we have real location) */}
          <View style={styles.locationRow}>
            <Text style={[styles.discoverTitle, { color: theme.colors.foreground }]}>Discover</Text>
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")} hitSlop={12}>
              <Ionicons name="search" size={22} color={theme.colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Editorial greeting */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingEyebrow}>Discover your next</Text>
            <Text style={[styles.greetingHeadline, { color: theme.colors.foreground }]}>Experience</Text>
            <Text style={[styles.greetingSub, { color: theme.colors.mutedForeground }]}>{personalized}</Text>
          </View>

          {/* Search bar */}
          <View style={[styles.searchBar, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
            <Ionicons name="search" size={20} color={theme.colors.mutedForeground} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search artists, events, or venues"
              placeholderTextColor={theme.colors.mutedForeground}
              style={[styles.searchInput, { color: theme.colors.foreground }]}
              returnKeyType="search"
              onSubmitEditing={() => goEventsWithSearch(searchInput)}
            />
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")} hitSlop={8}>
              <Ionicons name="options-outline" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {DISCOVER_CHIPS.map((chip) => {
              const selected = chipMatchesSelection(chip.category);
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.card,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => onChipPress(chip.category)}
                >
                  <Ionicons
                    name={chip.icon}
                    size={16}
                    color={selected ? theme.colors.primaryForeground : theme.colors.foreground}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: selected ? theme.colors.primaryForeground : theme.colors.foreground },
                    ]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Trending Now — horizontal carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Trending now</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.mutedForeground }]}>Hand-picked events for you</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")}>
              <Text style={[styles.viewAll, { color: theme.colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          {loadingTrending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : trendingEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingScroll}
              snapToAlignment="start"
              decelerationRate="fast"
            >
              {featured ? (
                <DiscoverFeaturedCard
                  event={featured}
                  minPrice={featuredMinPrice}
                  onPress={() => navigation.navigate("EventDetail", { eventId: featured.id })}
                  onFavoritePress={() => undefined}
                />
              ) : null}
              {trendingEvents.slice(1).map((event) => (
                <TrendingCompactCard
                  key={event.id}
                  event={event}
                  onPress={() => navigation.navigate("EventDetail", { eventId: event.id })}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[editorialCard(theme), styles.emptyCard]}>
              <Ionicons name="ticket-outline" size={40} color={theme.colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No events yet</Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => navigation.navigate("EventsList")}
              >
                <Text style={[styles.emptyButtonText, { color: theme.colors.primaryForeground }]}>Browse events</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Popular near you */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Popular near you</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.mutedForeground }]}>
                Happening soon — don&apos;t miss these dates.
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("EventsList")}>
              <Text style={[styles.viewAll, { color: theme.colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          {loadingUpcoming ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 24 }} />
          ) : upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => navigation.navigate("EventDetail", { eventId: event.id })}
              />
            ))
          ) : (
            <View style={[editorialCard(theme), styles.emptyCardSmall]}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.mutedForeground} />
              <Text style={[styles.emptyDesc, { color: theme.colors.mutedForeground, marginTop: 8 }]}>No upcoming events</Text>
            </View>
          )}
        </View>

        {/* Short CTA */}
        <View style={[styles.bottomCta, { backgroundColor: theme.colors.primary }]}>
          <Text style={[styles.bottomCtaTitle, { color: theme.colors.primaryForeground }]}>Ready for your next event?</Text>
          <Text style={styles.bottomCtaSub}>Browse live listings and secure tickets in minutes.</Text>
          <TouchableOpacity
            style={[styles.bottomCtaBtn, { backgroundColor: theme.colors.card }]}
            onPress={() => navigation.navigate("EventsList")}
          >
            <Ionicons name="ticket-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.bottomCtaBtnText, { color: theme.colors.primary }]}>Browse all events</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { paddingBottom: 8 }]}>
          <Text style={[styles.moreLabel, { color: theme.colors.mutedForeground }]}>More</Text>
          <View style={[editorialCard(theme), { paddingHorizontal: 0, overflow: "hidden" }]}>
            <TouchableOpacity
              style={[styles.linkRow, { borderBottomColor: theme.colors.border }]}
              onPress={() => navigation.navigate("EventsList")}
            >
              <Text style={[styles.linkLabel, { color: theme.colors.foreground }]}>All events</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
            </TouchableOpacity>
            {user && (
              <TouchableOpacity
                style={[styles.linkRow, { borderBottomWidth: 0 }]}
                onPress={() => navigation.getParent()?.navigate("Profile", { screen: "OrderHistory" })}
              >
                <Text style={[styles.linkLabel, { color: theme.colors.foreground }]}>My orders</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* FAB — Stitch discovery_home */}
      {isOrganizer ? (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              bottom: insets.bottom + 56,
            },
          ]}
          onPress={() => navigation.getParent()?.navigate("Organizer", { screen: "OrganizerDashboard" })}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={28} color={theme.colors.primaryForeground} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topIconBtn: { width: 40, alignItems: "center" },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
    flex: 1,
    textAlign: "center",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  locationLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 14, fontWeight: "700" },
  discoverTitle: { fontSize: 17, fontWeight: "800" },
  greetingBlock: { marginBottom: 16 },
  greetingEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#0A66F0",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  greetingHeadline: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  greetingSub: { fontSize: 15, lineHeight: 22 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "700" },
  section: {
    paddingHorizontal: lightTheme.spacing.md,
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 22, fontWeight: "800" },
  sectionSub: { fontSize: 14, marginTop: 4 },
  viewAll: { fontSize: 15, fontWeight: "700", marginTop: 20 },
  trendingScroll: {
    paddingRight: lightTheme.spacing.md,
    paddingBottom: 8,
  },
  loadingRow: { paddingVertical: 24, alignItems: "center" },
  emptyCard: { padding: 24, alignItems: "center", borderRadius: 20 },
  emptyCardSmall: { padding: 20, alignItems: "center", borderRadius: 20 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  emptyDesc: { fontSize: 14 },
  emptyButton: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  emptyButtonText: { fontWeight: "700" },
  bottomCta: {
    marginHorizontal: lightTheme.spacing.md,
    padding: 22,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  bottomCtaTitle: { fontSize: 19, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  bottomCtaSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", textAlign: "center", marginBottom: 16 },
  bottomCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  bottomCtaBtnText: { fontSize: 16, fontWeight: "700" },
  moreLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  linkLabel: { fontSize: 16, fontWeight: "600" },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  compactWrap: { width: 200, marginRight: 12 },
  compactCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  compactImg: { width: "100%", height: 140 },
  compactBody: { padding: 10 },
  compactCat: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  compactTitle: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  compactMeta: { fontSize: 12, marginTop: 6 },
});
