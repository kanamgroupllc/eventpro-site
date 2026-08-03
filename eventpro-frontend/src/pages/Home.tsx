import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentlyViewedEvents } from "@/components/RecentlyViewedEvents";
import { EventCard } from "@/components/EventCard";
import { CategoryFilter } from "@/components/CategoryFilter";
import {
  Ticket,
  Calendar,
  Shield,
  Zap,
  ChevronDown,
  ArrowRight,
  Clock,
  MapPin,
  Search,
  Sparkles,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiService } from "@/lib/api";
import type { Event } from "@/types/api";
import heroImage from "@/assets/hero-concert.jpg";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

function toEventStart(event: Event): Date | null {
  const raw = event.startTime ?? event.startDateTime ?? "";
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const Home = () => {
  const { isAuthenticated, user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [currentEvents, setCurrentEvents] = useState<Event[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(true);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [minPriceByEventId, setMinPriceByEventId] = useState<Record<string, number>>({});
  const [featuredMinPrice, setFeaturedMinPrice] = useState<number | null>(null);
  const [heroImgError, setHeroImgError] = useState(false);

  const firstName = user?.firstName?.trim();
  const personalized = firstName
    ? `Ready for your next night out, ${firstName}?`
    : "Discover unforgettable live experiences near you.";

  const loadTrendingEvents = useCallback(async () => {
    try {
      setIsLoadingTrending(true);
      let events: Event[];
      if (selectedCategory) {
        events = await apiService.getEventsByCategory(selectedCategory);
        events = events.slice(0, 6);
      } else {
        const kw = appliedSearch.trim() || undefined;
        events = await apiService.getEvents(1, 6, kw);
      }
      setTrendingEvents(events);
    } catch (error) {
      console.error("Failed to load trending events:", error);
      setTrendingEvents([]);
    } finally {
      setIsLoadingTrending(false);
    }
  }, [selectedCategory, appliedSearch]);

  const loadCurrentEvents = useCallback(async () => {
    try {
      setIsLoadingCurrent(true);
      const events = await apiService.getEvents(1, 50);
      const now = new Date();
      const upcomingEvents = events
        .filter((event) => {
          const s = toEventStart(event);
          return s != null && s >= now;
        })
        .sort((a, b) => {
          const sa = toEventStart(a)?.getTime() ?? 0;
          const sb = toEventStart(b)?.getTime() ?? 0;
          return sa - sb;
        })
        .slice(0, 6);
      setCurrentEvents(upcomingEvents);
    } catch (error) {
      console.error("Failed to load current events:", error);
      setCurrentEvents([]);
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  useEffect(() => {
    loadTrendingEvents();
  }, [loadTrendingEvents]);

  useEffect(() => {
    loadCurrentEvents();
  }, [loadCurrentEvents]);

  /** Lowest ticket price per event for editorial cards */
  useEffect(() => {
    const ids = [...new Set([...trendingEvents, ...currentEvents].map((e) => e.id))];
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
          const min = Math.min(...types.map((x) => x.price));
          return { id, min };
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
  }, [trendingEvents, currentEvents]);

  /** Hero featured card price (first trending event) */
  useEffect(() => {
    const fe = trendingEvents[0];
    if (!fe) {
      setFeaturedMinPrice(null);
      return;
    }
    const fromMap = minPriceByEventId[fe.id];
    if (fromMap != null && fromMap > 0) {
      setFeaturedMinPrice(fromMap);
      return;
    }
    apiService
      .getTicketTypes(fe.id)
      .then((types) => {
        if (!types.length) {
          setFeaturedMinPrice(null);
          return;
        }
        setFeaturedMinPrice(Math.min(...types.map((x) => x.price)));
      })
      .catch(() => setFeaturedMinPrice(null));
  }, [trendingEvents, minPriceByEventId]);

  const features = [
    {
      icon: Ticket,
      title: "Easy Ticketing",
      description: "Simple and secure ticket purchasing for all your favorite events",
    },
    {
      icon: Calendar,
      title: "Event Discovery",
      description: "Discover amazing events happening near you or around the world",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your data and transactions are protected with industry-leading security",
    },
    {
      icon: Zap,
      title: "Instant Access",
      description: "Get your tickets instantly and access them from any device",
    },
  ];

  const scrollToContent = () => {
    document.getElementById("trending")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleFindPulse = () => {
    setAppliedSearch(searchInput.trim());
  };

  const featured = trendingEvents[0];
  const featuredStart = featured ? toEventStart(featured) : null;

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Hero — Stitch discovery_web: purple wash + optional featured glass card */}
      <section className="relative min-h-[min(100vh,52rem)] flex items-center overflow-hidden -mt-[4rem] pt-[4rem]">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt=""
            className="w-full h-full object-cover scale-105"
            onError={() => setHeroImgError(true)}
          />
          {!heroImgError && <div className="absolute inset-0 hero-gradient-stitch" />}
          {heroImgError && <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-glow/50" />}
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-8 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="space-y-8 text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-full">
                <span className="w-2 h-2 rounded-full bg-primary-glow animate-pulse" />
                <span className="text-primary-foreground/90 font-headline text-xs font-bold uppercase tracking-widest">
                  {t("home.trending")}
                </span>
              </div>

              <h1 className="text-white font-headline font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.02] tracking-tighter drop-shadow-md">
                {t("home.hero.title")}
              </h1>

              <p className="text-white/85 text-lg md:text-xl max-w-lg leading-relaxed font-body">
                {t("home.hero.subtitle")}
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-headline font-bold px-8 py-6 text-base shadow-lg scale-100 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  onClick={() => navigate("/events")}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  {t("home.browse_events")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-white/10 backdrop-blur-md border-white/25 text-white hover:bg-white/20 font-headline font-bold px-8 py-6 text-base"
                  onClick={scrollToContent}
                >
                  <Sparkles className="mr-2 h-5 w-5 opacity-90" />
                  View lineup
                </Button>
              </div>
            </motion.div>

            {featured && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.65, delay: 0.1 }}
                className="hidden lg:block relative group"
              >
                <div className="absolute -inset-4 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
                <button
                  type="button"
                  onClick={() => navigate(`/events/${featured.id}`)}
                  className="relative w-full text-left bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2rem] editorial-card-shadow hover:border-white/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-10">
                    <div>
                      <span className="text-primary-glow font-headline font-bold block mb-1 text-sm">
                        {featured.categoryName || featured.category || "Featured"}
                      </span>
                      <h3 className="text-white text-2xl md:text-3xl font-headline font-extrabold line-clamp-2">
                        {featured.name || featured.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="text-white/60 text-xs font-medium uppercase tracking-wide block">From</span>
                      <span className="text-white text-2xl font-headline font-black">
                        {featuredMinPrice != null && featuredMinPrice > 0
                          ? new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                              minimumFractionDigits: 0,
                            }).format(featuredMinPrice)
                          : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 text-white/90">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary-glow" />
                      </div>
                      <div>
                        <p className="font-headline font-bold">
                          {featuredStart ? format(featuredStart, "MMM d, yyyy") : "Date TBD"}
                        </p>
                        <p className="text-xs text-white/55 uppercase tracking-tight">Tickets on KanamEvents</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/90">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-primary-glow" />
                      </div>
                      <div>
                        <p className="font-headline font-bold line-clamp-2">
                          {featured.venue ||
                            [featured.addressCity, featured.addressState].filter(Boolean).join(", ") ||
                            "Venue TBA"}
                        </p>
                        <p className="text-xs text-white/55 uppercase tracking-tight">Location</p>
                      </div>
                    </div>
                  </div>
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <motion.button
          type="button"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          onClick={scrollToContent}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/75 hover:text-white transition-colors cursor-pointer z-10"
        >
          <span className="text-sm font-medium">Discover more</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </motion.button>
      </section>

      {/* Stitch discovery: location + title (mobile), editorial greeting */}
      <section className="container mx-auto px-4 md:px-8 lg:px-12 -mt-10 relative z-20 max-w-7xl">
        <div className="flex items-center justify-between gap-3 mb-4 md:hidden">
          <h2 className="text-lg font-headline font-extrabold tracking-tight">Discover</h2>
        </div>
        <div className="mb-6 md:mb-8 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-1">Discover your next</p>
          <h2 className="text-3xl sm:text-4xl font-headline font-extrabold tracking-tight text-foreground">Experience</h2>
          <p className="text-muted-foreground mt-2 text-base font-body max-w-xl">{personalized}</p>
        </div>
      </section>

      {/* Category + search — raised card (Stitch discovery search bar) */}
      <section className="container mx-auto px-4 md:px-8 lg:px-12 relative z-20 -mt-2">
        <div className="bg-card rounded-[2rem] p-4 md:p-5 editorial-card-shadow border border-border/40 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 max-w-7xl mx-auto">
          <div className="flex-1 min-w-0">
            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              variant="editorial"
              showCultural={true}
              hideIcons
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-xl">
            <div className="relative flex-1 h-12 sm:h-14">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFindPulse()}
                placeholder="Search artists, events, or venues..."
                className="h-full pl-12 pr-12 rounded-2xl border-0 bg-secondary/80 focus-visible:ring-2 focus-visible:ring-primary/25"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-muted-foreground hover:text-primary"
                aria-label="Filters and more"
                onClick={() => navigate("/events")}
              >
                <SlidersHorizontal className="h-5 w-5" />
              </Button>
            </div>
            <Button
              type="button"
              className="h-12 sm:h-14 rounded-2xl px-8 font-headline font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleFindPulse}
            >
              Find events
            </Button>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section id="trending" className="py-20 md:py-24">
        <div className="container mx-auto px-4 md:px-8 lg:px-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16"
          >
            <div>
              <h2 className="text-foreground font-headline font-extrabold text-4xl md:text-5xl tracking-tighter">
                Trending now
              </h2>
              <p className="text-muted-foreground mt-2 text-lg font-body max-w-xl">{personalized}</p>
            </div>
            <Button
              variant="ghost"
              className="text-primary font-headline font-bold gap-2 self-start md:self-auto hover:gap-3 transition-all p-0 h-auto"
              onClick={() => navigate("/events")}
            >
              {t("common.view_all")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          {isLoadingTrending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-[1.5rem] border-0">
                  <Skeleton className="h-80 w-full" />
                  <div className="p-8 space-y-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : trendingEvents.length > 0 ? (
            <>
              {/* Mobile: horizontal carousel (Stitch discovery) */}
              <div
                className={cn(
                  "flex md:hidden gap-4 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory",
                  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                )}
              >
                {trendingEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className={cn(
                      "snap-start shrink-0 w-[min(88vw,24rem)] first:w-[min(92vw,26rem)]"
                    )}
                  >
                    <EventCard
                      event={event}
                      index={index}
                      variant="editorial"
                      ticketMinPrice={minPriceByEventId[event.id] ?? null}
                    />
                  </div>
                ))}
              </div>
              <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                {trendingEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    variant="editorial"
                    ticketMinPrice={minPriceByEventId[event.id] ?? null}
                  />
                ))}
              </div>
            </>
          ) : (
            <Card className="p-12 text-center rounded-[1.5rem] border-dashed">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-headline font-semibold mb-2">No events match</h3>
              <p className="text-muted-foreground mb-6 font-body">Try another category or search term.</p>
              <Button
                onClick={() => {
                  setSelectedCategory(null);
                  setAppliedSearch("");
                  setSearchInput("");
                }}
              >
                Clear filters
              </Button>
            </Card>
          )}
        </div>
      </section>

      {/* Upcoming */}
      <section className="py-20 md:py-24 relative overflow-hidden border-t border-border/40">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.03] to-transparent pointer-events-none" />
        <div className="container relative mx-auto px-4 md:px-8 lg:px-12 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
          >
            <div>
              <div className="inline-flex items-center gap-2 text-primary mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em] font-headline">Near you</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter text-foreground">
                Popular near you
              </h2>
              <p className="text-lg text-muted-foreground mt-2 font-body max-w-xl">
                Happening soon — don&apos;t miss these dates.
              </p>
            </div>
            <Button variant="outline" size="lg" className="rounded-2xl font-headline" onClick={() => navigate("/events")}>
              View all events
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          {isLoadingCurrent ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden rounded-[1.5rem]">
                  <Skeleton className="h-80 w-full" />
                  <div className="p-8 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : currentEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
              {currentEvents.map((event, index) => (
                <div key={event.id} className="relative">
                  {index === 0 && (
                    <div className="absolute -top-2 left-4 z-10 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-md">
                      Featured
                    </div>
                  )}
                  <EventCard
                    event={event}
                    index={index}
                    variant="editorial"
                    ticketMinPrice={minPriceByEventId[event.id] ?? null}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center rounded-[1.5rem]">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-headline font-semibold mb-2">No upcoming events</h3>
              <p className="text-muted-foreground mb-6 font-body">Check back soon for new listings.</p>
              <Button onClick={() => navigate("/events")}>Browse events</Button>
            </Card>
          )}
        </div>
      </section>

      {/* Stitch discovery_home: FAB for organizers */}
      {(hasRole("ORGANIZER") || hasRole("ADMIN")) && (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-6 right-4 z-40 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 md:bottom-8 md:right-8"
          onClick={() => navigate("/organizer/events/new")}
          aria-label="Create new event"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <RecentlyViewedEvents maxDisplay={6} />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-secondary/25">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4 tracking-tight">Why KanamEvents?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-body">
              Everything you need for seamless event experiences
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-all rounded-2xl border-border/50 bg-card/90">
                    <div className="h-14 w-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-5 shadow-md">
                      <Icon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-headline font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm font-body leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Newsletter — Stitch “Stay in the Pulse” (no backend yet) */}
      <section className="py-20 md:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-secondary/40 rounded-[2.5rem] md:rounded-[3rem] p-10 md:p-16 lg:p-24 relative overflow-hidden border border-border/30">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none" />
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-foreground font-headline font-extrabold text-4xl md:text-6xl tracking-tighter mb-6">
                Stay in the <span className="text-primary italic">pulse.</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl mb-10 font-body leading-relaxed">
                Get updates on new shows and exclusive drops. We&apos;ll only email when it matters.
              </p>
              <form
                className="flex flex-col sm:flex-row gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  toast.message("Coming soon", {
                    description: "Newsletter signup will be available in a future release.",
                  });
                }}
              >
                <Input
                  type="email"
                  placeholder="you@example.com"
                  className="flex-1 h-14 rounded-2xl border-border bg-background text-base"
                  aria-label="Email for updates"
                />
                <Button type="submit" className="h-14 px-10 rounded-2xl font-headline font-bold text-base shrink-0">
                  Join the list
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 pb-24">
        <div className="container mx-auto px-4 max-w-5xl">
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <Card className="relative overflow-hidden p-10 md:p-14 text-center border-0 rounded-[2rem]">
              <div className="absolute inset-0 bg-gradient-hero opacity-95" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-headline font-bold text-primary-foreground mb-4">
                  Ready for your next event?
                </h2>
                <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto font-body">
                  Browse live listings and secure tickets in minutes.{!isAuthenticated && " Create a free account to save orders and get notified."}
                </p>
                <Button
                  size="lg"
                  className="rounded-full bg-gradient-cta text-primary-foreground hover:opacity-95 text-lg px-10 py-6 border-0 shadow-lg"
                  onClick={() => navigate("/events")}
                >
                  <Ticket className="mr-2 h-5 w-5" />
                  Browse all events
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
