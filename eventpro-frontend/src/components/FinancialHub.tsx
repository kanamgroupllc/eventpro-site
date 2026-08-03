import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  BadgeCheck,
  Clock,
  Zap,
  Star,
  Download,
  TrendingUp,
  Plane,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { apiService } from "@/lib/api";
import type { OrganizerSummary, RecentSale } from "@/types/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 30_000;

const usdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNumber(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

type ActivityRow = {
  id: string;
  date: string;
  event: string;
  type: string;
  /** Ticket quantity or note (API does not return per-order dollar amounts for this feed). */
  detail: string;
  status: "Completed" | "Processing" | "Pending Settlement";
};

function tierLabel(tier: string | undefined): string {
  const t = (tier ?? "BASIC").toUpperCase();
  if (t === "ENTERPRISE") return "Enterprise Pro";
  if (t === "PRO") return "Pro";
  return "Starter";
}

export function FinancialHub() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [connectingBank, setConnectingBank] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("7d");

  const fetchFinancials = useCallback(async () => {
    try {
      const [data, sales] = await Promise.all([
        apiService.getOrganizerSummary(),
        apiService.getOrganizerRecentSales(50),
      ]);
      setSummary(data);
      setRecentSales(Array.isArray(sales) ? sales : []);
    } catch {
      setSummary(null);
      setRecentSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  useEffect(() => {
    const t = setInterval(fetchFinancials, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchFinancials]);

  useEffect(() => {
    const onInvalidate = () => fetchFinancials();
    window.addEventListener("organizer-summary-invalidate", onInvalidate);
    return () => window.removeEventListener("organizer-summary-invalidate", onInvalidate);
  }, [fetchFinancials]);

  const totalRevenue = summary ? toNumber(summary.totalRevenue) : 0;
  const platformFeesWithheld = summary ? toNumber(summary.platformFeesWithheld) : 0;
  const availableBalance = summary ? toNumber(summary.availableBalance) : 0;
  const pendingBalance = summary ? toNumber(summary.pendingBalance) : 0;
  const totalBalance = availableBalance + pendingBalance;
  const w9Submitted = Boolean(summary?.w9Submitted);
  const isVerified = Boolean(user?.isVerified) || user?.verificationStatus === "VERIFIED";
  const payoutsPausedByTax = totalRevenue >= 600 && !w9Submitted;
  const bankConnected = Boolean(user?.stripeConnectAccountId);
  const canPayout = isVerified && availableBalance > 0 && !payoutsPausedByTax && bankConnected;

  const trendPct = summary?.ticketsSoldTrendPercent;
  const trendDisplay =
    trendPct != null && !Number.isNaN(trendPct)
      ? `${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}% vs prior period`
      : "Ticket trend available after more sales data";

  const weeklyData = useMemo(() => {
    const numDays = chartPeriod === "30d" ? 30 : 7;
    const now = new Date();
    const dayKeys: string[] = [];
    const labels: string[] = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
      labels.push(numDays <= 7 ? format(d, "EEE") : format(d, "MMM d"));
    }
    const counts = new Map<string, number>();
    dayKeys.forEach((k) => counts.set(k, 0));
    recentSales.forEach((s) => {
      const sold = new Date(s.soldAt);
      if (Number.isNaN(sold.getTime())) return;
      sold.setHours(0, 0, 0, 0);
      const k = sold.toISOString().slice(0, 10);
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + (s.quantity || 1));
    });
    return dayKeys.map((k, i) => ({
      day: labels[i] ?? k,
      tickets: counts.get(k) ?? 0,
    }));
  }, [recentSales, chartPeriod]);

  const activityRows: ActivityRow[] = useMemo(() => {
    return recentSales.slice(0, 12).map((s) => ({
      id: s.orderId,
      date: format(new Date(s.soldAt), "MMM d, yyyy · h:mm a"),
      event: s.eventName,
      type: "Ticket sale",
      detail: `${s.quantity}× ${s.ticketTypeName}`,
      status: "Completed" as const,
    }));
  }, [recentSales]);

  const handlePayout = async () => {
    if (!canPayout || requestingPayout || availableBalance <= 0) return;
    setRequestingPayout(true);
    try {
      await apiService.requestPayout(availableBalance);
      toast.success("Payout requested. Funds will be sent to your bank account.");
      window.dispatchEvent(new Event("organizer-summary-invalidate"));
      fetchFinancials();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed";
      toast.error(msg);
    } finally {
      setRequestingPayout(false);
    }
  };

  const downloadCsv = () => {
    const header = ["Date", "Event", "Transaction type", "Detail", "Status"];
    const lines = [header.join(",")].concat(
      activityRows.map((r) =>
        [r.date, `"${r.event.replace(/"/g, '""')}"`, r.type, `"${r.detail.replace(/"/g, '""')}"`, r.status].join(",")
      )
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financial-activity.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  const tier = tierLabel(user?.subscriptionTier);
  const instantEligible = user?.subscriptionTier === "ENTERPRISE" || user?.subscriptionTier === "PRO";

  const statusBadge = (s: ActivityRow["status"]) => {
    const map = {
      Completed: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
      Processing: "bg-primary/15 text-primary",
      "Pending Settlement": "bg-amber-500/15 text-amber-800 dark:text-amber-200",
    };
    return <Badge className={cn("font-medium", map[s])}>{s}</Badge>;
  };

  const payoutTooltip =
    payoutsPausedByTax
      ? "Submit your W-9 in the 1099-K Tax Center to resume payouts (required at $600+ gross payments)."
      : !isVerified
        ? "Complete Identity Check in Profile to unlock payouts."
        : !bankConnected
          ? "Add your bank account to receive payouts."
          : availableBalance <= 0
            ? "No funds available for payout yet."
            : "Request a payout to your connected bank account.";

  return (
    <section id="organizer-financial" className="mb-10 scroll-mt-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pink-500/90 mb-1">Organization overview</p>
          <h2 className="text-3xl font-bold font-headline tracking-tight text-foreground">Financial Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">Performance tracking for the current cycle</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-block">
                <Button
                  className="rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-md gap-2 h-11 px-6"
                  disabled={!canPayout || requestingPayout}
                  onClick={handlePayout}
                >
                  <Plane className="h-4 w-4" />
                  {requestingPayout ? "Requesting…" : "Request payout"}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{payoutTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <Building2 className="absolute right-4 top-4 h-8 w-8 text-primary/80" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total balance</p>
            {loading ? (
              <Skeleton className="h-9 w-36" />
            ) : (
              <p className="text-3xl font-bold tabular-nums font-headline">{usdFormat.format(totalBalance)}</p>
            )}
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" />
              {trendDisplay}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-lg overflow-hidden">
          <CardContent className="p-5 relative">
            <BadgeCheck className="absolute right-4 top-4 h-8 w-8 text-primary-foreground/90" />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80 mb-1">
              Available for payout
            </p>
            {loading ? (
              <Skeleton className="h-9 w-36 bg-primary-foreground/20" />
            ) : (
              <p className="text-3xl font-bold tabular-nums font-headline">{usdFormat.format(availableBalance)}</p>
            )}
            <p className="text-sm text-primary-foreground/85 mt-2">Ready for transfer</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
          <CardContent className="p-5 relative">
            <Clock className="absolute right-4 top-4 h-8 w-8 text-pink-500/80" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Pending settlements</p>
            {loading ? (
              <Skeleton className="h-9 w-36" />
            ) : (
              <p className="text-3xl font-bold tabular-nums font-headline">{usdFormat.format(pendingBalance)}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {summary?.pendingHoldDays
                ? `Processing within ~${summary.pendingHoldDays} day window`
                : "Processing in 2–3 days"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="rounded-2xl border-border/60 shadow-sm lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="font-semibold font-headline">Sales volume (tickets)</h3>
                <p className="text-xs text-muted-foreground">From recent completed orders — dollar amounts are summarized above</p>
              </div>
              <Select value={chartPeriod} onValueChange={setChartPeriod}>
                <SelectTrigger className="w-[140px] rounded-xl border-border/80">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis hide />
                  <RechartsTooltip
                    cursor={{ fill: "hsl(var(--primary) / 0.08)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
                          <span className="font-semibold tabular-nums">
                            {(payload[0].payload as { tickets: number }).tickets} tickets
                          </span>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="tickets" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={chartPeriod === "30d" ? 12 : 40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-primary/20 bg-primary/[0.06] shadow-sm">
          <CardContent className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Star className="h-4 w-4 text-primary" />
              Current tier: <span className="text-primary">{tier}</span>
            </div>
            <div className="rounded-xl bg-background/80 border border-border/60 p-3 mb-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                Instant payouts
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {instantEligible
                  ? "As a Pro or Enterprise partner, you can request faster withdrawals subject to risk review."
                  : "Upgrade to Pro or Enterprise for instant and early payout options."}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-auto">
              Standard schedule: next cycle after events settle
              {platformFeesWithheld > 0 && (
                <>
                  <br />
                  Platform fees ({summary?.platformFeeRateLabel ?? "per your plan"}): −{usdFormat.format(platformFeesWithheld)}
                </>
              )}
            </p>
            <Button variant="outline" className="mt-4 rounded-xl border-primary/40" asChild>
              <Link to="/pricing">Upgrade tier</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm mb-6">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <h3 className="font-semibold font-headline">Recent activity</h3>
            <button
              type="button"
              onClick={downloadCsv}
              className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date &amp; time</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Transaction type</TableHead>
                <TableHead className="text-right">Detail</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No ticket sales in the recent feed yet.
                  </TableCell>
                </TableRow>
              ) : (
                activityRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm">{r.date}</TableCell>
                    <TableCell className="font-medium">{r.event}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{r.detail}</TableCell>
                    <TableCell className="text-right">{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bank connection & instant payout (condensed) */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-primary-glow/80 flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold">Payouts &amp; bank</p>
            <p className="text-sm text-muted-foreground">
              {bankConnected ? "Bank account connected." : "Connect a bank account to receive transfers."}
            </p>
          </div>
        </div>
        {!bankConnected && (
          <Button
            variant="outline"
            className="border-primary/50 text-primary shrink-0"
            disabled={connectingBank}
            onClick={async () => {
              setConnectingBank(true);
              try {
                const base = window.location.origin;
                const { url } = await apiService.connectOnboarding(`${base}/organizer`, `${base}/organizer`);
                if (url) window.location.href = url;
                else toast.error("Could not start bank setup.");
              } catch (e: unknown) {
                const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Request failed";
                toast.error(msg);
              } finally {
                setConnectingBank(false);
              }
            }}
          >
            {connectingBank ? "Redirecting…" : "Add bank account"}
          </Button>
        )}
      </div>
    </section>
  );
}
