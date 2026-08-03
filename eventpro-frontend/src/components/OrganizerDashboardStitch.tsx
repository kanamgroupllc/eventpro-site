import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiService } from "@/lib/api";
import type { OrganizerInsights, OrganizerSummary } from "@/types/api";
import { cn } from "@/lib/utils";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type Props = {
  firstName?: string;
  publishedEventCount: number;
  insights: OrganizerInsights | null;
};

export function OrganizerDashboardStitch({ firstName, publishedEventCount, insights }: Props) {
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);

  useEffect(() => {
    apiService
      .getOrganizerSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const engagementLabel = useMemo(() => {
    const n = insights?.eventPulses?.length ?? 0;
    if (n === 0) return "—";
    return n.toLocaleString();
  }, [insights]);

  const displayName = firstName?.trim() || "there";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-8 rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.06] p-6 md:p-8 shadow-sm"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold font-headline text-foreground tracking-tight">
            {greetingForNow()}, {displayName}!
          </h2>
          <p className="mt-1 text-muted-foreground">
            You have{" "}
            <span className="font-semibold text-foreground">{publishedEventCount}</span> published{" "}
            {publishedEventCount === 1 ? "event" : "events"} on your calendar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button variant="outline" className="rounded-full border-primary/30" asChild>
            <Link to="/orders">
              <Download className="h-4 w-4 mr-2" />
              Download reports
            </Link>
          </Button>
          <Button className="rounded-full bg-gradient-primary shadow-md" asChild>
            <Link to="/organizer/financials">
              <BarChart3 className="h-4 w-4 mr-2" />
              View analytics
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total revenue"
          value={summary != null ? usd.format(summary.totalRevenue) : "—"}
          sub={
            summary?.ticketsSoldTrendPercent != null
              ? `${summary.ticketsSoldTrendPercent >= 0 ? "+" : ""}${summary.ticketsSoldTrendPercent.toFixed(1)}% vs last period`
              : "All-time"
          }
          accent="primary"
        />
        <KpiCard
          label="Tickets sold"
          value={summary != null ? summary.ticketsSold.toLocaleString() : "—"}
          sub="Across published events"
          accent="emerald"
        />
        <KpiCard
          label="Active events"
          value={publishedEventCount.toLocaleString()}
          sub="Published & live"
          accent="violet"
        />
        <KpiCard
          label="Live pulses"
          value={engagementLabel}
          sub="Trending & velocity signals"
          accent="pink"
        />
      </div>
    </motion.section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "emerald" | "violet" | "pink";
}) {
  const bar =
    accent === "primary"
      ? "bg-primary"
      : accent === "emerald"
        ? "bg-emerald-500"
        : accent === "violet"
          ? "bg-violet-500"
          : "bg-pink-600";

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl md:text-3xl font-bold font-headline tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
          <TrendingUp className={cn("h-3.5 w-3.5", accent === "emerald" && "text-emerald-600")} />
          {sub}
        </p>
        <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full w-3/5 rounded-full opacity-90", bar)} />
        </div>
      </CardContent>
    </Card>
  );
}
