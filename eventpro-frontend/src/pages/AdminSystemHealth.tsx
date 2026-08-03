import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { SystemStatus } from "@/types/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  Activity,
  Bell,
  CloudDownload,
  Gauge,
  Globe,
  Lock,
  MoreHorizontal,
  Radio,
  Server,
  Shield,
  Users,
  Wrench,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

const NODE_LOAD = [
  { name: "NODE-A1", used: 62, cap: 100 },
  { name: "NODE-A2", used: 48, cap: 100 },
  { name: "NODE-B1", used: 71, cap: 100 },
  { name: "NODE-C1", used: 55, cap: 100 },
  { name: "NODE-D1", used: 38, cap: 100 },
];

const LOGS = [
  { t: "14:22", title: "Auto-scaling", detail: "Ticket API scaled +2 instances (us-east-2)." },
  { t: "14:18", title: "Security patch", detail: "TLS bundle updated on edge nodes." },
  { t: "13:45", title: "Database backup", detail: "Postgres snapshot completed (encrypted)." },
];

/**
 * Admin System Health: JVM heap + DB reachability from the API; other panels remain illustrative until observability is integrated.
 */
const AdminSystemHealth = () => {
  const adminApi = useAdminApi();
  const [tab, setTab] = useState<"overview" | "infra" | "security">("overview");
  const [cpuMode, setCpuMode] = useState(true);
  const [sys, setSys] = useState<SystemStatus | null>(null);

  useEffect(() => {
    if (!adminApi) return;
    adminApi.getSystemStatus().then(setSys).catch(() => setSys(null));
  }, [adminApi]);

  const heapChartData = useMemo(
    () => [{ name: "JVM heap", used: sys?.heapUsagePercent ?? 0, cap: 100 }],
    [sys?.heapUsagePercent]
  );

  const infraLogs = useMemo(() => {
    if (!sys) return LOGS;
    return [
      { t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), title: "Database", detail: `${sys.databaseStatus} (admin ping)` },
      { t: "Runtime", title: `Java ${sys.javaVersion}`, detail: sys.osName },
      {
        t: "Memory",
        title: "Heap usage",
        detail: `${sys.heapUsedMb} MB / ${sys.heapMaxMb} MB (${sys.heapUsagePercent}%)`,
      },
    ];
  }, [sys]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-headline text-primary">System Health</h1>
          <div className="flex gap-6 mt-3 border-b border-border/60">
            {(
              [
                ["overview", "Overview"],
                ["infra", "Infrastructure"],
                ["security", "Security"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "pb-2 text-sm font-medium -mb-px border-b-2 transition-colors",
                  tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Input placeholder="Search logs…" className="rounded-full pl-4 bg-primary/[0.06] border-border/60" />
          </div>
          <Button size="icon" variant="ghost" className="shrink-0 rounded-full relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
          </Button>
        </div>
      </div>

      {tab === "overview" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2 rounded-2xl border-0 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-lg">
              <CardContent className="p-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 text-primary-foreground/90 text-sm mb-2">
                    <Activity className="h-4 w-4" />
                    Global status
                  </div>
                  <p className="text-3xl font-bold font-headline">{sys?.overallStatus ?? "…"}</p>
                  <p className="text-sm text-primary-foreground/85 mt-2">
                    DB {sys?.databaseStatus ?? "—"} · Heap {sys?.heapUsagePercent ?? "—"}%
                  </p>
                </div>
                <Radio className="h-10 w-10 text-primary-foreground/80" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:gap-4">
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Gauge className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-[10px]">
                      max {sys?.heapMaxMb ?? "—"} MB
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{sys?.heapUsedMb ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Heap used (MB)</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <Badge className="text-[10px] bg-primary/15 text-primary">live</Badge>
                  </div>
                  <p className="text-2xl font-bold tabular-nums">{sys?.heapUsagePercent ?? "—"}%</p>
                  <p className="text-xs text-muted-foreground">Heap usage</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-semibold font-headline">Server cluster load</h2>
                    <p className="text-xs text-muted-foreground">Real-time resource allocation across nodes</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn(!cpuMode && "text-muted-foreground")}>CPU</span>
                    <Switch checked={cpuMode} onCheckedChange={setCpuMode} />
                    <span className={cn(cpuMode && "text-muted-foreground")}>Memory</span>
                  </div>
                </div>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={heapChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={[0, 100]} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                              Load {payload[0].payload.used}%
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="cap" fill="hsl(var(--primary) / 0.12)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="used" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold font-headline">Infrastructure logs</h2>
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {infraLogs.map((log) => (
                    <div key={`${log.t}-${log.title}`} className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
                      <p className="text-[11px] text-muted-foreground">{log.t}</p>
                      <p className="font-medium">{log.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{log.detail}</p>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" className="w-full mt-4 rounded-xl" type="button" asChild>
                  <Link to="/admin/audit-logs">View audit history</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <h2 className="font-semibold font-headline mb-4">Regional distribution</h2>
                <div className="h-40 rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-accent/10 flex items-center justify-center relative">
                  <Globe className="h-20 w-20 text-primary/40" />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Badge variant="secondary" className="rounded-full">
                      US
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      EU
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      AS
                    </Badge>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Americas: Healthy
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-pink-500" />
                    Europe: Latency +15%
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Asia: Healthy
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 shadow-sm relative overflow-visible">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Live network flow</p>
                    <p className="text-2xl font-bold flex items-center gap-2 mt-1">
                      <CloudDownload className="h-6 w-6 text-primary" />
                      4.2 GB/s
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Bandwidth usage</p>
                    <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
                      <div className="h-full w-[64%] rounded-full bg-primary" />
                    </div>
                    <p className="text-xs text-right text-muted-foreground mt-1">64%</p>
                  </div>
                </div>
                <div className="mt-6 rounded-xl border border-border/60 bg-primary/[0.04] p-4 flex gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">SSL protocols active</p>
                    <p className="text-xs text-muted-foreground">TLS 1.3 · AES-256</p>
                  </div>
                </div>
                <Button
                  size="icon"
                  className="absolute -top-3 -right-3 h-11 w-11 rounded-full shadow-lg"
                  aria-label="Tools"
                >
                  <Wrench className="h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {tab === "infra" && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Server className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Infrastructure drill-down connects to your observability stack (Grafana, Datadog, etc.).
          </CardContent>
        </Card>
      )}

      {tab === "security" && (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            <Lock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Security posture, certificates, and findings will appear here when wired to your SIEM.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSystemHealth;
