import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import type { Event } from "@eventpro/shared";
import { STANDARD_EVENT_CATEGORIES, CULTURAL_EVENT_CATEGORIES } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { EventCard } from "../components/EventCard";
import { SearchEventCard } from "../components/SearchEventCard";
import { theme as staticTheme } from "../theme";
import { sectionLabel, editorialCard } from "../theme/screenStyles";
import { Ionicons } from "@expo/vector-icons";

const EVENT_CATEGORIES = [...STANDARD_EVENT_CATEGORIES, ...CULTURAL_EVENT_CATEGORIES, "Other"];

const LAVENDER = "#F3E5F5";

function isInNextDays(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return d >= now && d <= end;
}

function isMusicEvent(e: Event): boolean {
  const c = `${e.categoryName ?? ""} ${(e as any).category ?? ""}`.toLowerCase();
  return c.includes("music");
}

export function EventsListScreen({ route, navigation }: { route: any; navigation: any }) {
  const { api } = useAuth();
  const { theme } = useTheme();
  const organizerId = route?.params?.organizerId;
  const initialQuery = typeof route?.params?.initialQuery === "string" ? route.params.initialQuery : "";
  const stitchSearchUi = route?.params?.stitchSearchUi === true;
  const initialKeyword = initialQuery || (stitchSearchUi ? "Techno Music" : "");

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);

  const [keyword, setKeyword] = useState(initialKeyword);
  const [searchQuery, setSearchQuery] = useState(initialKeyword);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);

  const [chipWeekend, setChipWeekend] = useState(false);
  const [chipMusic, setChipMusic] = useState(false);
  const [chipNearby, setChipNearby] = useState(false);

  const loadEvents = useCallback(
    async (reset: boolean, queryOverride?: string) => {
      try {
        if (selectedCategory && !stitchSearchUi) {
          const list = await api.getEventsByCategory(selectedCategory);
          setEvents(Array.isArray(list) ? list : []);
          setHasMore(false);
          pageRef.current = 1;
          return;
        }
        const q = (queryOverride !== undefined ? queryOverride : searchQuery).trim();
        const nextPage = reset ? 1 : pageRef.current;
        const size = 24;
        const list = await api.getEvents(nextPage, size, q || undefined, organizerId);
        const arr = Array.isArray(list) ? list : [];
        if (reset) {
          setEvents(arr);
          pageRef.current = 2;
        } else {
          setEvents((prev) => [...prev, ...arr]);
          pageRef.current = nextPage + 1;
        }
        setHasMore(arr.length >= size);
      } catch {
        if (reset) setEvents([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [api, organizerId, searchQuery, selectedCategory, stitchSearchUi]
  );

  useEffect(() => {
    setLoading(true);
    pageRef.current = 1;
    loadEvents(true);
  }, [loadEvents]);

  useEffect(() => {
    const q = typeof route?.params?.initialQuery === "string" ? route.params.initialQuery : "";
    if (!stitchSearchUi) {
      setKeyword(q);
      setSearchQuery(q);
    }
  }, [route?.params?.initialQuery, stitchSearchUi]);

  const filteredForStitch = useMemo(() => {
    let list = events;
    if (!stitchSearchUi) return list;
    if (chipWeekend) {
      list = list.filter((e) => isInNextDays(e.startTime ?? (e as any).startDateTime, 5));
    }
    if (chipMusic) {
      list = list.filter(isMusicEvent);
    }
    if (chipNearby) {
      // Placeholder: no geolocation yet — slight nudge: keep list as-is
    }
    return list;
  }, [events, stitchSearchUi, chipWeekend, chipMusic, chipNearby]);

  const runSearch = () => {
    const next = keyword;
    setSearchQuery(next);
    setLoading(true);
    pageRef.current = 1;
    loadEvents(true, next);
  };

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSearchQuery("");
    setKeyword(stitchSearchUi ? "" : "");
    setChipWeekend(false);
    setChipMusic(false);
    setChipNearby(false);
    setLoading(true);
    pageRef.current = 1;
    loadEvents(true, "");
  };

  const clearStitchFilters = () => {
    setChipWeekend(false);
    setChipMusic(false);
    setChipNearby(false);
    setKeyword("");
    setSearchQuery("");
    setLoading(true);
    pageRef.current = 1;
    loadEvents(true, "");
  };

  const onRefresh = () => {
    setRefreshing(true);
    pageRef.current = 1;
    loadEvents(true);
  };

  const onLoadMore = () => {
    if (!stitchSearchUi || loadingMore || !hasMore || (selectedCategory && !stitchSearchUi)) return;
    setLoadingMore(true);
    loadEvents(false);
  };

  const listData = stitchSearchUi ? filteredForStitch : events;

  if (loading && events.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: stitchSearchUi ? LAVENDER : theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const headerStitch = stitchSearchUi ? (
    <View style={{ backgroundColor: LAVENDER, paddingBottom: 8 }}>
      <View style={[styles.stitchSearchBar, { backgroundColor: theme.colors.primary + "18" }]}>
        <Ionicons name="search" size={20} color={theme.colors.mutedForeground} />
        <TextInput
          style={[styles.stitchInput, { color: theme.colors.foreground }]}
          placeholder="Techno Music"
          placeholderTextColor={theme.colors.mutedForeground}
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
          onSubmitEditing={runSearch}
        />
        <TouchableOpacity
          onPress={() => {
            setKeyword("");
            setSearchQuery("");
            setLoading(true);
            pageRef.current = 1;
            loadEvents(true, "");
          }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 15 }}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            chipWeekend
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.card },
          ]}
          onPress={() => setChipWeekend(!chipWeekend)}
        >
          <Text
            style={[
              styles.chipText,
              { color: chipWeekend ? theme.colors.primaryForeground : theme.colors.foreground },
            ]}
          >
            This Weekend
          </Text>
          {chipWeekend ? <Ionicons name="close" size={16} color={theme.colors.primaryForeground} /> : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            chipMusic ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.card },
          ]}
          onPress={() => setChipMusic(!chipMusic)}
        >
          <Ionicons name="musical-notes" size={16} color={chipMusic ? theme.colors.primaryForeground : theme.colors.primary} />
          <Text
            style={[
              styles.chipText,
              { color: chipMusic ? theme.colors.primaryForeground : theme.colors.foreground },
            ]}
          >
            Music
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            chipNearby ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.card },
          ]}
          onPress={() => setChipNearby(!chipNearby)}
        >
          <Ionicons name="navigate" size={16} color={chipNearby ? theme.colors.primaryForeground : theme.colors.primary} />
          <Text
            style={[
              styles.chipText,
              { color: chipNearby ? theme.colors.primaryForeground : theme.colors.foreground },
            ]}
          >
            Nearby
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <View style={styles.resultsRow}>
        <Text style={[styles.resultsCount, { color: theme.colors.mutedForeground }]}>
          SHOWING {listData.length} RESULTS
        </Text>
        <TouchableOpacity onPress={clearStitchFilters}>
          <Text style={{ color: "#a15c44", fontWeight: "700", fontSize: 13 }}>Clear all filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  ) : null;

  const headerDefault = !stitchSearchUi ? (
    <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: 8, paddingBottom: 8 }}>
      <Text style={[sectionLabel(theme), { marginBottom: 6 }]}>
        {organizerId ? "Same organizer" : "Browse"}
      </Text>
      <Text style={{ fontSize: 15, lineHeight: 22, color: theme.colors.mutedForeground }}>
        {organizerId ? "Other events by this organizer" : "Find tickets for shows and experiences"}
      </Text>
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: stitchSearchUi ? LAVENDER : theme.colors.background }]}>
      {headerDefault}
      {headerStitch}
      {!organizerId && !stitchSearchUi && (
        <>
          <View style={[editorialCard(theme), styles.searchWrap]}>
            <Ionicons name="search" size={20} color={theme.colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.foreground }]}
              placeholder="Search events..."
              placeholderTextColor={theme.colors.mutedForeground}
              value={keyword}
              onChangeText={setKeyword}
              returnKeyType="search"
              onSubmitEditing={runSearch}
              editable={!selectedCategory}
            />
            {(keyword.length > 0 || selectedCategory) && (
              <TouchableOpacity onPress={clearFilters}>
                <Ionicons name="close-circle" size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.categorySection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              <TouchableOpacity
                style={[
                  styles.categoryPill,
                  { borderColor: theme.colors.border, backgroundColor: selectedCategory === undefined ? theme.colors.primary : theme.colors.card },
                ]}
                onPress={() => { setSelectedCategory(undefined); setLoading(true); }}
              >
                <Text style={[styles.categoryPillText, { color: selectedCategory === undefined ? theme.colors.primaryForeground : theme.colors.foreground }]}>All</Text>
              </TouchableOpacity>
              {EVENT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      { borderColor: theme.colors.border, backgroundColor: isSelected ? theme.colors.primary : theme.colors.card },
                    ]}
                    onPress={() => { setSelectedCategory(isSelected ? undefined : cat); setLoading(true); }}
                  >
                    <Text style={[styles.categoryPillText, { color: isSelected ? theme.colors.primaryForeground : theme.colors.foreground }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={null}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          stitchSearchUi && hasMore ? (
            <TouchableOpacity
              style={[styles.loadMore, { backgroundColor: theme.colors.primary + "20" }]}
              onPress={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <>
                  <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 15 }}>Load more events</Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.primary} />
                </>
              )}
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={[styles.empty, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>No events found</Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.mutedForeground }]}>
              {keyword ? "Try a different search." : "Check back later for new events."}
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          stitchSearchUi ? (
            <SearchEventCard event={item} onPress={() => navigation.navigate("EventDetail", { eventId: item.id })} />
          ) : (
            <EventCard event={item} onPress={() => navigation.navigate("EventDetail", { eventId: item.id })} />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: staticTheme.spacing.md,
    marginBottom: staticTheme.spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  stitchSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: staticTheme.spacing.md,
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    gap: 10,
  },
  stitchInput: { flex: 1, fontSize: 16 },
  chipsRow: {
    paddingHorizontal: staticTheme.spacing.md,
    gap: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipText: { fontSize: 14, fontWeight: "700" },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: staticTheme.spacing.md,
    marginBottom: 8,
  },
  resultsCount: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  loadMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: staticTheme.spacing.md,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 16,
  },
  categorySection: { marginBottom: 16, minHeight: 52 },
  categoryList: {
    paddingHorizontal: staticTheme.spacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  categoryPillText: { fontSize: 14, fontWeight: "600" },
  listContent: { padding: staticTheme.spacing.md, paddingBottom: 32 },
  empty: {
    padding: 32,
    borderRadius: staticTheme.radius.lg,
    alignItems: "center",
    marginTop: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  emptyDesc: { fontSize: 14, marginTop: 4, textAlign: "center" },
});
