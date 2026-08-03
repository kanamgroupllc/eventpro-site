import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  BarChart3,
  Key,
  Loader2,
  Palette,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { FinancialHub } from "@/components/FinancialHub";
import { TaxCenter } from "@/components/TaxCenter";
import { ExportCenter } from "@/components/ExportCenter";
import { OrganizerInsightsSection } from "@/components/OrganizerInsightsSection";
import { LiveTicketFeed } from "@/components/LiveTicketFeed";
import { apiService } from "@/lib/api";
import type { Event, EventPulse, OrganizerInsights, OrganizerSummary } from "@/types/api";
import { motion } from "framer-motion";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function pulseBadgeClass(v: EventPulse["velocity"]): string {
  if (v === "trending_up") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200";
  if (v === "slowing") return "bg-amber-500/15 text-amber-900 dark:text-amber-100";
  return "bg-primary/15 text-primary";
}

/**
 * Web Stitch-style financial & insights hub — real data from organizer APIs.
 */
const OrganizerFinancials = () => {
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, ins, evs] = await Promise.all([
          apiService.getOrganizerSummary(),
          apiService.getOrganizerInsights(),
          apiService.getOrganizerEvents(),
        ]);
        if (!cancelled) {
          setSummary(s);
          setInsights(ins);
          setEvents(Array.isArray(evs) ? evs : []);
        }
      } catch {
        if (!cancelled) {
          setSummary(null);
          setInsights(null);
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const published = useMemo(
    () => events.filter((e) => e.status === "PUBLISHED" || !e.status),
    [events]
  );
  const subtitleEventName = published[0]?.name ?? "your events";

  const pulseByEventId = useMemo(
    () => new Map((insights?.eventPulses ?? []).map((p) => [p.eventId, p])),
    [insights]
  );

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" asChild>
              <Link to="/organizer">
                <ArrowLeft className="h-4 w-4" />
                Back to organizer hub
              </Link>
            </Button>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Financials &amp; analytics</p>
            <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight mt-1">Event insights</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Real-time performance for <span className="font-medium text-foreground">{subtitleEventName}</span> and your full
              catalog. Data updates as orders and payouts sync.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/organizer/branding">
                <Palette className="h-4 w-4 mr-1" />
                Branding
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/organizer/team">
                <Users className="h-4 w-4 mr-1" />
                Team
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/organizer/api-keys">
                <Key className="h-4 w-4 mr-1" />
                API keys
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI strip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10"
        >
          <Card className="rounded-2xl border-border/60 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">Total revenue</p>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mt-2 opacity-80" />
              ) : (
                <p className="text-3xl font-bold font-headline mt-1 tabular-nums">{usd.format(summary?.totalRevenue ?? 0)}</p>
              )}
              <p className="text-sm text-primary-foreground/85 mt-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {summary?.ticketsSoldTrendPercent != null
                  ? `${summary.ticketsSoldTrendPercent >= 0 ? "+" : ""}${summary.ticketsSoldTrendPercent.toFixed(1)}% tickets vs prior`
                  : "Lifecycle total from paid orders"}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tickets sold</p>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mt-2 text-muted-foreground" />
              ) : (
                <p className="text-3xl font-bold font-headline mt-1 tabular-nums">{(summary?.ticketsSold ?? 0).toLocaleString()}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">All-time tickets from your events</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published events</p>
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mt-2 text-muted-foreground" />
              ) : (
                <p className="text-3xl font-bold font-headline mt-1 tabular-nums">{published.length}</p>
              )}
              <p className="text-sm text-muted-foreground mt-2">Live on the platform</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Page views</p>
              <p className="text-3xl font-bold font-headline mt-1 tabular-nums text-muted-foreground">—</p>
              <p className="text-sm text-muted-foreground mt-2">Connect analytics to track web traffic</p>
            </CardContent>
          </Card>
        </motion.div>

        <FinancialHub />

        <div className="mt-10 mb-10">
          <TaxCenter />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <ExportCenter />
          <OrganizerInsightsSection />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2">
            <LiveTicketFeed />
          </div>
          <Card className="rounded-2xl border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold font-headline">Event pulses</h3>
              </div>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (insights?.eventPulses?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Publish events and sell tickets to see velocity and alerts here.</p>
              ) : (
                <ul className="space-y-3">
                  {insights!.eventPulses!.map((p) => (
                    <li key={p.eventId} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm line-clamp-1">{p.eventName}</span>
                        <Badge className={pulseBadgeClass(p.velocity)} variant="secondary">
                          {p.velocity.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.label}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border/60 mb-10">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold font-headline">Event performance</h3>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">Use Export center above for CSV</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pulse</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {published.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                      No published events yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  published.map((ev) => {
                    const pulse = pulseByEventId.get(ev.id);
                    return (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">
                          <Link to={`/events/${ev.id}`} className="hover:underline text-primary">
                            {ev.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(ev.startTime), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ev.status ?? "PUBLISHED"}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[240px]">
                          {pulse?.label ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 flex flex-wrap gap-4 items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground text-center">
            Tip: bookmark this page or use{" "}
            <Link to="/organizer" className="text-primary font-medium underline">
              Organizer hub
            </Link>{" "}
            for day-to-day event management.
          </p>
        </div>
      </div>
    </PageShell>
  );
};

export default OrganizerFinancials;
