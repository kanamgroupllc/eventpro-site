import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Ticket, X } from "lucide-react";
import { apiService } from "@/lib/api";
import type { Event } from "@/types/api";
import { EventCard } from "@/components/EventCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";

const Events = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const organizerIdFromUrl = searchParams.get("organizerId") ?? undefined;

  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [minPriceByEventId, setMinPriceByEventId] = useState<Record<string, number>>({});
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevSearchQueryRef = useRef<string>("");
  const prevCategoryRef = useRef<string | undefined>(undefined);
  const prevOrganizerIdRef = useRef<string | undefined>(undefined);
  const isInitialMount = useRef(true);

  const qs = searchParams.toString();
  /** Sync input when URL query changes (navbar search, clear, back/forward) — not when only local typing */
  useEffect(() => {
    setSearchQuery(new URLSearchParams(qs).get("q") ?? "");
  }, [qs]);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      let data: Event[];

      if (selectedCategory) {
        data = await apiService.getEventsByCategory(selectedCategory);
      } else {
        data = await apiService.getEvents(1, 24, searchQuery || undefined, organizerIdFromUrl);
      }

      setEvents(data);
    } catch (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, organizerIdFromUrl]);

  useEffect(() => {
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
      searchDebounceTimerRef.current = null;
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSearchQueryRef.current = searchQuery;
      prevCategoryRef.current = selectedCategory;
      prevOrganizerIdRef.current = organizerIdFromUrl;
      loadEvents();
      return;
    }

    const searchQueryChanged = searchQuery !== prevSearchQueryRef.current;
    const categoryChanged = selectedCategory !== prevCategoryRef.current;
    const organizerIdChanged = organizerIdFromUrl !== prevOrganizerIdRef.current;

    prevSearchQueryRef.current = searchQuery;
    prevCategoryRef.current = selectedCategory;
    prevOrganizerIdRef.current = organizerIdFromUrl;

    if (categoryChanged || organizerIdChanged) {
      loadEvents();
      return;
    }

    if (searchQueryChanged) {
      if (searchQuery.length > 0) {
        searchDebounceTimerRef.current = setTimeout(() => {
          loadEvents();
        }, 450);
      } else {
        loadEvents();
      }
    }

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
        searchDebounceTimerRef.current = null;
      }
    };
  }, [searchQuery, selectedCategory, organizerIdFromUrl, loadEvents]);

  useEffect(() => {
    const ids = events.map((e) => e.id);
    if (ids.length === 0) {
      setMinPriceByEventId({});
      return;
    }
    let cancelled = false;
    Promise.all(
      ids.map(async (id) => {
        try {
          const types = await apiService.getTicketTypes(id);
          if (!types.length) return { id, min: 0 };
          return { id, min: Math.min(...types.map((x) => x.price)) };
        } catch {
          return { id, min: 0 };
        }
      })
    ).then((rows) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      for (const r of rows) {
        if (r.min > 0) next[r.id] = r.min;
      }
      setMinPriceByEventId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [events]);

  const handleCategoryChange = (category: string | null) => {
    const next = category ?? undefined;
    setSelectedCategory(next);
    if (next) {
      setSearchQuery("");
      setSearchParams((prev) => {
        const n = new URLSearchParams(prev);
        n.delete("q");
        return n;
      }, { replace: true });
    }
  };

  const clearFilters = () => {
    setSelectedCategory(undefined);
    setSearchQuery("");
    setSearchParams((prev) => {
      const n = new URLSearchParams(prev);
      n.delete("q");
      return n;
    }, { replace: true });
  };

  const hasFilters = !!(selectedCategory || searchQuery.trim());

  const headline = organizerIdFromUrl ? "More from this organizer" : "Discover events";
  const subline = organizerIdFromUrl
    ? "Other events by the same organizer"
    : "Find tickets for shows, sports, and experiences near you.";

  return (
    <PageShell className="pb-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-7xl pt-8 md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 md:mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-foreground">
            {headline}
          </h1>
          <p className="text-lg text-muted-foreground mt-2 max-w-2xl font-body">{subline}</p>
        </motion.div>

        {/* Search + filters — Stitch search_results */}
        <div className="rounded-[2rem] bg-card border border-border/50 editorial-card-shadow p-4 md:p-6 mb-8 md:mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Artists, venues, or vibes..."
                value={searchQuery}
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  if (!v.trim()) {
                    setSearchParams(
                      (prev) => {
                        const n = new URLSearchParams(prev);
                        n.delete("q");
                        return n;
                      },
                      { replace: true }
                    );
                  }
                }}
                disabled={!!selectedCategory}
                className="h-12 sm:h-14 pl-12 rounded-2xl border-0 bg-secondary/70 focus-visible:ring-2 focus-visible:ring-primary/20 text-base"
              />
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                className="text-primary font-semibold shrink-0 sm:self-center rounded-xl"
                onClick={clearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          <div className="overflow-x-auto hide-scrollbar -mx-1 px-1 pb-1">
            <CategoryFilter
              selectedCategory={selectedCategory ?? null}
              onCategoryChange={handleCategoryChange}
              variant="editorial"
              showCultural={true}
              hideIcons
            />
          </div>

          {!isLoading && events.length > 0 && (
            <p className="mt-5 text-sm font-medium text-muted-foreground font-body">
              {events.length} event{events.length !== 1 ? "s" : ""} found
              {selectedCategory ? ` · ${selectedCategory}` : ""}
            </p>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {[...Array(9)].map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-[1.5rem] border-0 shadow-sm">
                <Skeleton className="h-80 w-full rounded-none" />
                <div className="p-8 space-y-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <Card className="p-12 text-center rounded-[1.5rem] border-dashed max-w-lg mx-auto">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-headline font-semibold mb-2">No events found</h3>
            <p className="text-muted-foreground font-body">
              {hasFilters ? "Try adjusting your search or filters." : "Check back soon for new events."}
            </p>
            {hasFilters && (
              <Button className="mt-6 rounded-full" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {events.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                variant="editorial"
                ticketMinPrice={minPriceByEventId[event.id] ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
};

export default Events;
