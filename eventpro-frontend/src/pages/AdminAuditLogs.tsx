import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAdminApi } from "@/hooks/useAdminApi";
import type { AuditActivity } from "@/types/api";
import {
  Search,
  Download,
  Shield,
  Wallet,
  User,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  FileText,
  Menu,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AuditCategory = "all" | "security" | "finance" | "users" | "events" | "system";

interface AuditRow {
  id: string;
  ts: string;
  actor: string;
  actorInitials: string;
  action: string;
  actionDanger?: boolean;
  entity: string;
  status: string;
  statusTone: "success" | "info" | "critical" | "pending" | "neutral";
  ip?: string;
  category: Exclude<AuditCategory, "all">;
  body: string;
}

function mapAuditActivity(a: AuditActivity): AuditRow {
  const tone = (a.statusTone ?? "neutral") as AuditRow["statusTone"];
  const validTones: AuditRow["statusTone"][] = ["success", "info", "critical", "pending", "neutral"];
  const statusTone = validTones.includes(tone) ? tone : "neutral";
  const rawCat = (a.category ?? "system").toLowerCase();
  const category: AuditRow["category"] =
    rawCat === "security" || rawCat === "finance" || rawCat === "users" || rawCat === "events" || rawCat === "system"
      ? rawCat
      : "system";
  return {
    id: a.id,
    ts: a.occurredAt,
    actor: a.actor,
    actorInitials: a.actorInitials,
    action: a.action,
    actionDanger: a.actionDanger,
    entity: a.entity,
    status: a.status,
    statusTone,
    ip: a.ip,
    category,
    body: a.body,
  };
}

const FILTERS: { key: AuditCategory; label: string; icon: typeof Shield }[] = [
  { key: "all", label: "All Activities", icon: FileText },
  { key: "security", label: "Security", icon: Shield },
  { key: "finance", label: "Finance", icon: Wallet },
  { key: "users", label: "Users", icon: User },
  { key: "events", label: "Events", icon: Calendar },
  { key: "system", label: "System", icon: Settings },
];

function statusClass(tone: AuditRow["statusTone"]) {
  switch (tone) {
    case "success":
      return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
    case "critical":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
    case "pending":
      return "bg-primary/15 text-primary";
    case "info":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const PAGE_SIZE = 20;

const AdminAuditLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const adminApi = useAdminApi();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<AuditCategory>("all");
  const [page, setPage] = useState(1);
  const searchInputMountRef = useRef(true);

  useEffect(() => {
    if (searchInputMountRef.current) {
      searchInputMountRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!adminApi) return;
    setLoading(true);
    adminApi
      .getAuditActivityPage({
        page,
        size: PAGE_SIZE,
        category: filter === "all" ? undefined : filter,
        search: debouncedSearch || undefined,
      })
      .then((res) => {
        setRows(res.content.map(mapAuditActivity));
        setTotalElements(res.totalElements);
        setTotalPages(Math.max(1, res.totalPages));
      })
      .catch(() => {
        toast({ title: "Could not load audit activity", variant: "destructive" });
        setRows([]);
        setTotalElements(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [adminApi, page, filter, debouncedSearch, toast]);

  const exportCsv = async () => {
    if (!adminApi) {
      toast({ title: "Not signed in as admin", variant: "destructive" });
      return;
    }
    try {
      const res = await adminApi.getAuditActivityPage({
        page: 1,
        size: 100,
        category: filter === "all" ? undefined : filter,
        search: debouncedSearch || undefined,
      });
      const list = res.content.map(mapAuditActivity);
      const header = ["timestamp", "user", "action", "entity", "status", "ip"];
      const lines = [header.join(",")].concat(
        list.map((r) =>
          [r.ts, r.actor, r.action, r.entity, r.status, r.ip ?? ""].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        )
      );
      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `eventpro-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Export started", description: "Up to 100 rows matching current filters." });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email?.split("@")[0] || "Admin";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Mobile top bar */}
      <div className="flex md:hidden items-center justify-between gap-3 mb-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader>
              <SheetTitle>Audit Center</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6 text-sm font-medium">
              <Link to="/admin/overview">Overview</Link>
              <Link to="/admin/audit-logs" className="text-primary">
                Audit Logs
              </Link>
              <Link to="/admin/users">Users</Link>
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-bold font-headline">Audit Center</span>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-1 rounded-full bg-muted/80 pl-1 pr-2 py-1 max-w-[120px]">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium truncate hidden min-[380px]:inline">Admin</span>
          </div>
        </div>
      </div>

      <div className="hidden md:flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-primary uppercase mb-1">System integrity</p>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
            A high-fidelity monitoring stream of administrative actions, system modifications, and security-relevant
            events across the KanamEvents infrastructure.
          </p>
        </div>
        <Button
          className="rounded-full bg-gradient-primary hover:opacity-95 shrink-0"
          onClick={exportCsv}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="md:hidden space-y-4">
        <p className="text-[10px] font-bold tracking-widest text-primary uppercase">System integrity</p>
        <h1 className="text-2xl font-bold font-headline">Security Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Real-time monitoring of administrative actions and system-level events across the KanamEvents ecosystem.
        </p>
        <Button className="w-full rounded-full bg-gradient-primary" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Export report
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by action, user, or entity ID…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10 h-11 rounded-full bg-primary/[0.06] border-primary/10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide hidden sm:inline">
          Quick filters:
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:thin]">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                filter === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-primary/[0.08] text-primary hover:bg-primary/15"
              )}
            >
              {key !== "all" && <Icon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/30">
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity / affected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading activity…
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                  {format(new Date(row.ts), "MMM d, yyyy HH:mm:ss")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {row.actorInitials}
                    </div>
                    <span className="font-medium">{row.actor}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "font-medium",
                      row.actionDanger ? "text-destructive" : "text-primary"
                    )}
                  >
                    {row.action}
                  </span>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-primary/8 px-2 py-1 rounded-md">{row.entity}</code>
                </TableCell>
                <TableCell>
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", statusClass(row.statusTone))}>
                    {row.status}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{row.ip ?? "—"}</TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No activity matches your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
          <span>
            Showing{" "}
            {totalElements === 0
              ? "0"
              : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalElements)}`}{" "}
            of {totalElements} actions
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {loading && <p className="text-center text-muted-foreground py-8">Loading activity…</p>}
        {!loading &&
          rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                {row.category} • {format(new Date(row.ts), "MMM d, h:mm a")}
              </span>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", statusClass(row.statusTone))}>
                {row.status}
              </span>
            </div>
            <p className={cn("font-bold text-foreground mb-2", row.actionDanger && "text-destructive")}>
              {row.action}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">{row.body}</p>
          </div>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No logs match your filters.</p>
        )}
      </div>

      <div className="md:hidden flex items-center justify-between text-sm text-muted-foreground pt-2">
        <span>
          Showing{" "}
          {totalElements === 0
            ? "0"
            : `${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalElements)}`}{" "}
          of {totalElements}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-4">
        Activity is stored in the platform audit table (append-only). Search and filters run on the server with pagination.
      </p>
    </motion.div>
  );
};

export default AdminAuditLogs;
