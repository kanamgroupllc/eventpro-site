import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { ApiKey, CreateApiKeyResponse } from "@/types/api";
import {
  Key,
  Loader2,
  Copy,
  Trash2,
  MoreVertical,
  Rocket,
  FlaskConical,
  Terminal,
  Plus,
  Menu,
  BarChart3,
  Shield,
  AlertTriangle,
  Info,
  Download,
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

const ROW_ICONS = [Rocket, FlaskConical, Terminal] as const;

function envBadge(name: string) {
  const n = name.toLowerCase();
  if (n.includes("stage") || n.includes("staging"))
    return { label: "STAGE", className: "bg-primary/15 text-primary border border-primary/25" };
  if (n.includes("local") || n.includes("dev"))
    return { label: "LOCAL", className: "bg-muted text-muted-foreground border border-border" };
  if (n.includes("prod") || n.includes("production"))
    return { label: "PROD", className: "bg-slate-900 text-white dark:bg-slate-800" };
  return { label: "PROD", className: "bg-slate-900 text-white dark:bg-slate-800" };
}

function maskKey(prefix: string, id: string) {
  const tail = id.replace(/-/g, "").slice(-4, 4).padEnd(4, "0");
  return `evp_${prefix.slice(0, 4)}…••••••••${tail}`;
}

const AdminApiKeys = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<CreateApiKeyResponse | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const enterprise = (user?.subscriptionTier ?? "BASIC").toUpperCase() === "ENTERPRISE";

  const load = useCallback(async () => {
    if (!enterprise) {
      setLoading(false);
      setKeys([]);
      return;
    }
    setLoading(true);
    try {
      const list = await apiService.listApiKeys();
      setKeys(list);
    } catch {
      toast({ title: "Could not load API keys", variant: "destructive" });
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [enterprise, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keys;
    return keys.filter((k) => k.name.toLowerCase().includes(q) || k.keyPrefix.toLowerCase().includes(q));
  }, [keys, search]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email?.split("@")[0] || "Admin";

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await apiService.createApiKey(name);
      setNewKeyResult(res);
      setCreateName("");
      setCreateOpen(false);
      await load();
      toast({ title: "API key created" });
    } catch {
      toast({ title: "Could not create key", description: "Enterprise plan required.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await apiService.revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast({ title: "Key revoked" });
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  const copyText = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Mobile header */}
      <div className="flex md:hidden items-center justify-between gap-3 mb-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px]">
            <SheetHeader>
              <SheetTitle>KanamEvents Admin</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-6 text-sm font-medium">
              <Link to="/admin/overview">Overview</Link>
              <Link to="/admin/api-keys" className="text-primary">
                API Keys
              </Link>
              <Link to="/admin/audit-logs">Audit Logs</Link>
              <Link to="/admin/revenue">Revenue</Link>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold font-headline flex-1 text-center">API Management</h1>
        <Avatar className="h-9 w-9 ring-2 ring-primary/15 shrink-0">
          {user?.profilePictureUrl ? <AvatarImage src={user.profilePictureUrl} alt="" /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      {user?.subscriptionTier?.toUpperCase() === "ENTERPRISE" && (
        <p className="md:hidden text-center text-xs font-semibold tracking-widest text-primary uppercase">
          Enterprise tier
        </p>
      )}

      <div className="hidden md:flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-3 flex-wrap">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            SECURITY
          </span>
          <span className="text-sm font-medium text-primary">
            • {enterprise ? keys.length : "—"} Active Keys
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="hidden md:block text-3xl font-bold font-headline tracking-tight text-foreground">
            API Access Control
          </h1>
          <h1 className="md:hidden text-2xl font-bold font-headline leading-tight">
            Platform <span className="text-primary">Access</span> Control
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">
            Manage high-frequency API keys for enterprise organizers. Revoke, rotate, or create new
            environment-specific credentials for your event ecosystem.
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-primary p-5 text-primary-foreground shadow-lg min-w-[260px] lg:max-w-sm">
          <div className="flex items-center justify-between gap-2 mb-3">
            <BarChart3 className="h-5 w-5 opacity-90" />
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-full">
              Monthly
            </span>
          </div>
          <p className="text-2xl font-bold font-headline">99.9%</p>
          <p className="text-xs opacity-80">SLA availability (target)</p>
          <p className="text-xl font-bold font-headline mt-3">2.4M</p>
          <p className="text-xs opacity-80">Total API calls (illustrative)</p>
          <div className="mt-4 h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full w-[85%] rounded-full bg-white/90" />
          </div>
          <p className="text-[10px] mt-2 opacity-75 uppercase tracking-wide">85% of monthly quota</p>
        </div>
      </div>

      {!enterprise && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-foreground">Enterprise plan required</p>
          <p className="text-muted-foreground mt-1">
            API keys are available on Enterprise. Upgrade to create and manage keys.
          </p>
          <Button className="mt-3 rounded-full bg-gradient-primary" asChild>
            <Link to="/pricing">View plans</Link>
          </Button>
        </div>
      )}

      {newKeyResult && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-2">
            Copy your new key now — it won&apos;t be shown again.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 break-all rounded-lg bg-muted px-3 py-2 text-xs font-mono">
              {newKeyResult.key}
            </code>
            <Button type="button" variant="secondary" size="sm" onClick={() => copyText(newKeyResult.key)}>
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setNewKeyResult(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-bold font-headline">Environment credentials</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-full border-primary/20"
            onClick={() =>
              toast({
                title: "Export",
                description: "Connect to your logging pipeline when export endpoints are available.",
              })
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export logs
          </Button>
          <Button
            className="rounded-full bg-gradient-primary hover:opacity-95"
            disabled={!enterprise}
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create new API key
          </Button>
        </div>
      </div>

      <div className="relative max-w-xl md:max-w-none mx-auto md:mx-0">
        <Input
          placeholder="Search keys…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-full bg-primary/[0.06] border-primary/10 h-11"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          Loading…
        </div>
      ) : enterprise ? (
        <>
          <div className="hidden md:block rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/30">
                  <TableHead>Key name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Masked key</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      No keys match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((k, i) => {
                    const Icon = ROW_ICONS[i % ROW_ICONS.length];
                    const env = envBadge(k.name);
                    const created = k.createdAt ? format(new Date(k.createdAt), "MMM d, yyyy") : "—";
                    return (
                      <TableRow key={k.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{k.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", env.className)}>
                            {env.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs font-mono bg-muted/50 px-2 py-1 rounded">
                            {maskKey(k.keyPrefix, k.id)}
                          </code>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{created}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">—</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => copyText(k.keyPrefix)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              disabled={revokingId === k.id}
                              onClick={() => void handleRevoke(k.id)}
                            >
                              {revokingId === k.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
              <span>
                Showing {filtered.length} of {keys.length} active keys
              </span>
            </div>
          </div>

          <div className="md:hidden space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold font-headline">Active keys</h3>
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                {keys.length} Total
              </span>
            </div>
            {filtered.map((k) => (
              <div key={k.id} className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-primary">● ACTIVE</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => copyText(k.keyPrefix)}>Copy prefix</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={revokingId === k.id}
                        onClick={() => void handleRevoke(k.id)}
                      >
                        Revoke
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="font-semibold mb-2">{k.name}</p>
                <div className="flex items-center gap-2 rounded-xl bg-primary/[0.06] px-3 py-2 font-mono text-xs">
                  <span className="truncate flex-1">{maskKey(k.keyPrefix, k.id)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyText(k.keyPrefix)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex justify-between mt-3 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <span>
                    Created {k.createdAt ? format(new Date(k.createdAt), "MMM d, yyyy") : "—"}
                  </span>
                  <span>Last used Never</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No keys yet.</p>
            )}
          </div>
        </>
      ) : null}

      <div className="hidden md:grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border-l-4 border-destructive bg-destructive/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">Critical action: revoking keys</p>
            <p className="text-sm text-muted-foreground mt-1">
              Revoking a production key can break integrations immediately. Rotate credentials in a staging
              environment first when possible.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border-l-4 border-primary bg-primary/5 p-4 flex gap-3">
          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground">Key rotation policy</p>
            <p className="text-sm text-muted-foreground mt-1">
              We recommend rotating production keys every 90 days. Next review:{" "}
              <span className="font-medium text-foreground">scheduled with your security team</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Shield className="h-4 w-4" />
          Key history
        </div>
        <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-sm text-muted-foreground">
          Revoked keys are removed from this list. For a full trail of creates and revocations, use{" "}
          <Link to="/admin/audit-logs" className="text-primary font-medium underline">
            Audit logs
          </Link>
          .
        </div>
      </div>

      <div className="md:hidden rounded-2xl border border-primary/30 bg-card p-5 shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-5 w-5 text-primary" />
          <p className="font-bold font-headline">API keys</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Usage metrics are not exposed in the dashboard yet. Active keys for your organization are listed above when you are on
          Enterprise.
        </p>
        <Button
          className="w-full mt-2 rounded-full bg-gradient-primary -mb-2"
          disabled={!enterprise}
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create new API key
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create API key</DialogTitle>
            <DialogDescription>Choose a descriptive name (e.g. Production API, Staging).</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g. Main Production"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-primary" disabled={!createName.trim() || creating} onClick={() => void handleCreate()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminApiKeys;
