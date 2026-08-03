import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Ticket,
  Users,
  TrendingUp,
  Filter,
  CheckCircle2,
  MoreHorizontal,
  Menu,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AdminStats, RevenueData } from "@/types/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const RANGE = [
  { key: "24h", label: "24h", api: "1d" },
  { key: "7d", label: "7d", api: "7d" },
  { key: "30d", label: "30d", api: "30d" },
  { key: "1y", label: "1y", api: "365d" },
] as const;

function formatAxisDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }).toUpperCase();
  } catch {
    return dateStr;
  }
}

/** Illustrative payout rows until a payouts API exists. */
const SAMPLE_PAYOUTS = [
  { org: "Electric Pulse Org.", date: "May 24, 2024", amount: 12450, status: "COMPLETED" as const },
  { org: "Neon Nights Ltd.", date: "May 22, 2024", amount: 8120.5, status: "PENDING" as const },
  { org: "Global Records", date: "May 18, 2024", amount: 45000, status: "COMPLETED" as const },
];

const AdminRevenue = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [series, setSeries] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<(typeof RANGE)[number]["key"]>("30d");

  const apiPeriod = RANGE.find((r) => r.key === range)?.api ?? "30d";

  const load = useCallback(async () => {
    if (!adminApi) return;
    setLoading(true);
    try {
      const [s, rev] = await Promise.all([adminApi.getStats(), adminApi.getRevenue(apiPeriod)]);
      setStats(s);
      setSeries(rev);
    } catch {
      toast({ title: "Failed to load revenue", variant: "destructive" });
      setSeries([]);
    } finally {
      setLoading(false);
    }
  }, [adminApi, apiPeriod, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPeriodRevenue = useMemo(() => series.reduce((s, r) => s + (r.revenue ?? 0), 0), [series]);
  const ticketsInPeriod = useMemo(() => series.reduce((s, r) => s + (r.ticketsSold ?? 0), 0), [series]);

  const barData = useMemo(() => {
    const rows = series.map((r) => ({
      ...r,
      label: formatAxisDate(r.date),
      value: r.revenue ?? 0,
    }));
    const max = Math.max(0, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, highlight: r.value > 0 && r.value === max }));
  }, [series]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email?.split("@")[0] || "Admin";

  if (!adminApi) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Mobile header row (matches revenue analytics mock) */}
      <div className="flex md:hidden items-center justify-between gap-3 mb-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader>
              <SheetTitle>KanamEvents Admin</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6">
              <Link to="/admin/overview" className="text-sm font-medium py-2">
                Overview
              </Link>
              <Link to="/admin/users" className="text-sm font-medium py-2">
                Users
              </Link>
              <Link to="/admin/verification" className="text-sm font-medium py-2">
                Verification
              </Link>
              <Link to="/admin/events" className="text-sm font-medium py-2">
                Events
              </Link>
              <Link to="/admin/revenue" className="text-sm font-medium py-2 text-primary">
                Revenue
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold font-headline flex-1 text-center">Revenue Analytics</h1>
        <Avatar className="h-9 w-9 ring-2 ring-primary/15 shrink-0">
          {user?.profilePictureUrl ? <AvatarImage src={user.profilePictureUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="hidden md:flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground mt-1">Platform revenue, tickets, and trends.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGE.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold transition-colors",
              range === r.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-primary/[0.08] text-muted-foreground hover:bg-primary/15"
            )}
          >
            {r.label}
          </button>
        ))}
        <Button variant="outline" size="icon" className="rounded-full ml-auto h-9 w-9 border-primary/20" aria-label="Filters">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      ) : stats ? (
        <>
          <div className="rounded-3xl bg-gradient-primary p-6 sm:p-8 text-primary-foreground shadow-lg">
            <p className="text-xs font-semibold tracking-widest opacity-90">TOTAL PLATFORM REVENUE</p>
            <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
              <p className="text-3xl sm:text-4xl font-bold font-headline tabular-nums">
                ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                <TrendingUp className="h-4 w-4" />
                {(stats.revenueGrowth ?? 0) >= 0 ? "+" : ""}
                {(stats.revenueGrowth ?? 0).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs opacity-80 mt-3">All-time gross from paid orders. Period chart below uses the selected range.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-primary/[0.06] border border-primary/10 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Ticket className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">Tickets sold</p>
              <p className="text-xl font-bold font-headline mt-1 tabular-nums">{ticketsInPeriod.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-1">In selected range</p>
            </div>
            <div className="rounded-2xl bg-primary/[0.06] border border-primary/10 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground">New subs</p>
              <p className="text-xl font-bold font-headline mt-1 text-muted-foreground">—</p>
              <p className="text-[11px] text-muted-foreground mt-1">Stripe subs sync (soon)</p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold font-headline">Revenue Trends</h2>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-muted text-muted-foreground">
                Last {range === "24h" ? "24h" : range === "7d" ? "7 days" : range === "30d" ? "30 days" : "year"}
              </span>
            </div>
            <div className="h-[240px] w-full">
              {barData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  No data for this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `$${v}`}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                      }}
                      formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Revenue"]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
                      {barData.map((entry, i) => (
                        <Cell
                          key={`c-${entry.date}-${i}`}
                          fill={entry.highlight ? "hsl(214 95% 48%)" : "hsl(214 40% 82%)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Period total:{" "}
              <strong>${totalPeriodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-5 sm:p-6">
            <h2 className="text-lg font-bold font-headline mb-4">Revenue Source Breakdown</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Illustrative split — wire to accounting when multi-stream reporting is available.
            </p>
            <div className="space-y-5">
              {[
                { label: "Ticket Sales", pct: 65, color: "bg-primary" },
                { label: "Subscribers", pct: 20, color: "bg-primary" },
                { label: "Add-ons & VIP", pct: 15, color: "bg-primary/70" },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span>{row.label}</span>
                    <span className="text-muted-foreground">{row.pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", row.color)}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-5 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-lg font-bold font-headline">Recent Payouts</h2>
              <span className="text-xs font-semibold text-muted-foreground">Sample data</span>
            </div>
            <ul className="space-y-3">
              {SAMPLE_PAYOUTS.map((p) => (
                <li
                  key={p.org}
                  className="flex items-start gap-3 rounded-xl border border-border/50 p-3 bg-muted/20"
                >
                  <div className="mt-0.5">
                    {p.status === "COMPLETED" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <MoreHorizontal className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.org}</p>
                    <p className="text-xs text-muted-foreground">{p.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold tabular-nums">
                      ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wide",
                        p.status === "COMPLETED" ? "text-emerald-600" : "text-primary"
                      )}
                    >
                      {p.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground py-12 text-center">Could not load revenue.</p>
      )}
    </motion.div>
  );
};

export default AdminRevenue;
