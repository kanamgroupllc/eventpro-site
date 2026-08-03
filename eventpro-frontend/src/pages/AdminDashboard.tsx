import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminApi } from "@/hooks/useAdminApi";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Calendar,
  Ticket,
  DollarSign,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ChevronRight,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";
import type { AdminStats, RevenueData, PendingVerification } from "@/types/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const FEE_RATE = 0.08;

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, "M");
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`.replace(/\.0k$/, "k");
  return String(Math.round(n));
}

function formatMoneyCompact(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`.replace(/\.0M$/, "M");
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`.replace(/\.0k$/, "k");
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function daysYearToDate(): number {
  const start = new Date(new Date().getFullYear(), 0, 1);
  return Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86400000));
}

function periodToApiKey(overviewPeriod: "30d" | "90d" | "ytd"): string {
  if (overviewPeriod === "ytd") return `${daysYearToDate()}d`;
  return overviewPeriod;
}

function formatAxisDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d
      .toLocaleDateString(undefined, { day: "2-digit", month: "short" })
      .replace(",", "")
      .toUpperCase();
  } catch {
    return dateStr;
  }
}

const growthBadge = (pct: number | undefined, stable?: boolean) => {
  if (stable) {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">Stable</span>
    );
  }
  if (pct == null || Number.isNaN(pct)) {
    return <span className="text-[11px] font-medium text-muted-foreground">—</span>;
  }
  const positive = pct >= 0;
  return (
    <span
      className={cn(
        "text-[11px] font-semibold px-2 py-0.5 rounded-full",
        positive ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
      )}
    >
      {positive ? "+" : ""}
      {pct.toFixed(0)}%
    </span>
  );
};

const KPI_ICONS = [Users, Calendar, Ticket, DollarSign] as const;
const KPI_ICON_WRAP = [
  "bg-primary/12 text-primary",
  "bg-primary/10 text-primary",
  "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  "bg-foreground/10 text-foreground",
] as const;

function roleBreakdownFromStats(s: AdminStats) {
  const a = s.usersAttendeeCount ?? 0;
  const o = s.usersOrganizerCount ?? 0;
  const ad = s.usersAdminCount ?? 0;
  const sum = a + o + ad;
  const denom = sum > 0 ? sum : Math.max(s.totalUsers, 1);
  const pct = (n: number) => Math.round((n / denom) * 1000) / 10;
  return [
    { key: "USER" as const, label: "Attendees", count: a, pct: pct(a) },
    { key: "ORGANIZER" as const, label: "Organizers", count: o, pct: pct(o) },
    { key: "ADMIN" as const, label: "Admins", count: ad, pct: pct(ad) },
  ];
}

const PIE_COLORS = ["hsl(214 95% 48%)", "hsl(214 70% 35%)", "hsl(220 10% 45%)"];

const OVERVIEW_PERIODS = [
  { key: "30d" as const, label: "Last 30 Days" },
  { key: "90d" as const, label: "Last 90 Days" },
  { key: "ytd" as const, label: "Year to Date" },
];

const AdminDashboard = () => {
  const adminApi = useAdminApi();
  const { toast } = useToast();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenueSeries, setRevenueSeries] = useState<RevenueData[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [overviewPeriod, setOverviewPeriod] = useState<"30d" | "90d" | "ytd">("30d");
  const [actingId, setActingId] = useState<string | null>(null);

  const revenueApiPeriod = periodToApiKey(overviewPeriod);

  const loadAll = useCallback(async () => {
    if (!adminApi) return;
    setSyncing(true);
    try {
      const [s, rev, pending] = await Promise.all([
        adminApi.getStats(),
        adminApi.getRevenue(revenueApiPeriod),
        adminApi.getVerificationPending(20),
      ]);
      setStats(s);
      setRevenueSeries(rev);
      setPendingVerifications(pending);
    } catch {
      toast({ title: "Could not refresh dashboard", variant: "destructive" });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [adminApi, revenueApiPeriod, toast]);

  useEffect(() => {
    if (!adminApi) return;
    setLoading(true);
    loadAll();
  }, [adminApi, loadAll]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    const breakdown = roleBreakdownFromStats(stats);
    return breakdown.map((b, i) => ({
      name: b.label,
      value: b.count,
      pct: b.pct,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [stats]);

  const attendeePct = stats ? roleBreakdownFromStats(stats)[0]?.pct ?? 0 : 0;

  const barChartData = useMemo(() => {
    return revenueSeries.map((r) => {
      const rev = Number(r.revenue ?? 0);
      return {
        ...r,
        label: formatAxisDate(r.date),
        netSales: rev * (1 - FEE_RATE),
        fees: rev * FEE_RATE,
      };
    });
  }, [revenueSeries]);

  const handleApprove = async (submissionId: string) => {
    if (!adminApi) return;
    setActingId(submissionId);
    try {
      await adminApi.approveVerification(submissionId);
      setPendingVerifications((prev) => prev.filter((s) => s.id !== submissionId));
      toast({ title: "Verification approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!adminApi) return;
    setActingId(submissionId);
    try {
      await adminApi.rejectVerification(submissionId);
      setPendingVerifications((prev) => prev.filter((s) => s.id !== submissionId));
      toast({ title: "Verification rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const formatSubmitted = (s: string) => {
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" });
    } catch {
      return s;
    }
  };

  if (!adminApi) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold font-headline tracking-tight text-foreground">
            Platform Overview
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Real-time monitoring and ecosystem performance.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3 shrink-0">
          <div className="flex flex-wrap gap-2">
            {OVERVIEW_PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setOverviewPeriod(p.key)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold border transition-colors",
                  overviewPeriod === p.key
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : "border-border/80 bg-card text-muted-foreground hover:border-primary/30"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-10 w-10 border-primary/20"
              onClick={() => void loadAll()}
              disabled={syncing}
              aria-label="Sync data"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex items-center gap-2 py-24 text-muted-foreground justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading dashboard…
        </div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
            {[
              {
                title: "Total Users",
                value: formatCompact(stats.totalUsers),
                badge: growthBadge(stats.userGrowth),
                icon: KPI_ICONS[0],
                wrap: KPI_ICON_WRAP[0],
              },
              {
                title: "Active Events",
                value: formatCompact(stats.totalEvents),
                badge: growthBadge(stats.eventGrowth),
                icon: KPI_ICONS[1],
                wrap: KPI_ICON_WRAP[1],
              },
              {
                title: "Tickets Sold",
                value: formatCompact(stats.totalTicketsSold),
                badge: growthBadge(stats.ticketGrowth, Math.abs(stats.ticketGrowth) < 0.5),
                icon: KPI_ICONS[2],
                wrap: KPI_ICON_WRAP[2],
              },
              {
                title: "Total Revenue",
                value: formatMoneyCompact(stats.totalRevenue),
                badge: growthBadge(stats.revenueGrowth),
                icon: KPI_ICONS[3],
                wrap: KPI_ICON_WRAP[3],
              },
            ].map((kpi) => {
              const Icon = kpi.icon;
              return (
                <div
                  key={kpi.title}
                  className="rounded-2xl bg-card border border-border/50 shadow-lg p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", kpi.wrap)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {kpi.badge}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">{kpi.value}</p>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border/50 shadow-lg p-5 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold font-headline">Revenue Growth</h2>
                <p className="text-sm text-muted-foreground">
                  Net sales vs estimated platform fees (fees shown as {Math.round(FEE_RATE * 100)}% of gross for
                  illustration).
                </p>
              </div>
              <div className="h-[300px] w-full">
                {barChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    No revenue data in this period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${v}`}
                        width={52}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                        formatter={(value: number) => [`$${Number(value).toFixed(2)}`, ""]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="netSales" stackId="rev" name="Net Sales" fill="hsl(214 95% 48%)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="fees" stackId="rev" name="Fees" fill="hsl(214 40% 82%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-5 sm:p-6 flex flex-col flex-1">
                <div className="mb-2">
                  <h2 className="text-lg font-bold font-headline">User Distribution</h2>
                  <p className="text-sm text-muted-foreground">Base breakdown by roles</p>
                </div>
                <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
                  {pieData.every((d) => d.value === 0) ? (
                    <p className="text-sm text-muted-foreground text-center px-4">No role data.</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={76}
                            paddingAngle={2}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {pieData.map((entry) => (
                              <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string, item: { payload?: { pct?: number } }) => [
                              `${value} (${item.payload?.pct ?? 0}%)`,
                              name,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pt-1">
                        <div className="text-center">
                          <p className="text-xl font-bold font-headline leading-tight">{Math.round(attendeePct)}%</p>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Attendees
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <ul className="space-y-2 mt-2">
                  {pieData.slice(0, 2).map((d) => (
                    <li key={d.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-semibold text-muted-foreground">
                        {formatCompact(Number(d.value))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-5">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-bold font-headline">System Health</h2>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
                <ul className="space-y-3 text-sm">
                  {[
                    { label: "Core API", value: "99.9%" },
                    { label: "Payments Gateway", value: "100%" },
                    { label: "Database Clusters", value: "99.8%" },
                  ].map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Activity className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        {row.label}
                      </span>
                      <span className="font-semibold text-emerald-600 tabular-nums">{row.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Uptime targets are illustrative; wire to observability when available.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border/50 shadow-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-border/50">
              <div>
                <h2 className="text-lg font-bold font-headline">Verification Queue</h2>
                <p className="text-sm text-muted-foreground">Pending organizer applications awaiting review.</p>
              </div>
              <Link
                to="/admin/verification"
                className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                View all queue
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {pendingVerifications.length === 0 ? (
              <p className="p-8 text-center text-muted-foreground text-sm">No pending verifications.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Organizer</TableHead>
                    <TableHead>Requested on</TableHead>
                    <TableHead className="hidden md:table-cell">Entity</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerifications.slice(0, 8).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/12 flex items-center justify-center text-xs font-bold text-primary">
                            {row.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{row.email}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{row.legalEntityType}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatSubmitted(row.submittedAt)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{row.legalEntityType}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            disabled={actingId === row.id}
                            onClick={() => void handleReject(row.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-full bg-gradient-primary hover:opacity-95"
                            disabled={actingId === row.id}
                            onClick={() => void handleApprove(row.id)}
                          >
                            {actingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      ) : (
        <p className="text-muted-foreground py-12 text-center">Failed to load stats.</p>
      )}
    </motion.div>
  );
};

export default AdminDashboard;
