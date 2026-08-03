import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Zap,
  LayoutDashboard,
  Calendar,
  Users,
  Palette,
  Key,
  BarChart3,
  Wallet,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Settings,
  Filter,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/types/api";
import { format } from "date-fns";

function tierAllowsTeam(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

function roleBadgeClass(role: string): string {
  const r = role.toUpperCase();
  if (r === "ADMIN") return "bg-primary/15 text-primary";
  if (r === "EDITOR") return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  return "bg-muted text-muted-foreground";
}

const TeamManagement = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"members" | "invites">("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "EDITOR" | "VIEWER">("EDITOR");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const allowed = tierAllowsTeam(user?.subscriptionTier);

  const load = useCallback(async () => {
    if (!allowed) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await apiService.listTeamMembers();
      setMembers(list);
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not load team";
      toast({ title: msg, variant: "destructive" });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [allowed, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (m.email ?? "").toLowerCase();
      return !q || name.includes(q) || email.includes(q) || (m.role ?? "").toLowerCase().includes(q);
    });
  }, [members, query]);

  const counts = useMemo(() => {
    const admins = members.filter((m) => m.role?.toUpperCase() === "ADMIN").length;
    const editors = members.filter((m) => m.role?.toUpperCase() === "EDITOR").length;
    const viewers = members.filter((m) => m.role?.toUpperCase() === "VIEWER").length;
    return { admins, editors, viewers };
  }, [members]);

  const seatCap = user?.subscriptionTier?.toUpperCase() === "ENTERPRISE" ? 20 : 10;

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast({ title: "Enter an email address", variant: "destructive" });
      return;
    }
    setInviteLoading(true);
    try {
      await apiService.inviteTeamMember(email, inviteRole);
      toast({ title: "Team member added", description: `${email} can now access your events.` });
      setInviteOpen(false);
      setInviteEmail("");
      await load();
      await refreshUser?.();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Invite failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setActingId(userId);
    try {
      await apiService.removeTeamMember(userId);
      toast({ title: "Removed from team" });
      await load();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Remove failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: "ADMIN" | "EDITOR" | "VIEWER") => {
    setActingId(userId);
    try {
      await apiService.updateTeamMemberRole(userId, role);
      toast({ title: "Role updated" });
      await load();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Update failed";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <PageShell>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-card/40">
          <div className="p-6 lg:sticky lg:top-0">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">The Electric Editorial</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Premium Events</p>
              </div>
            </div>
            <nav className="space-y-1">
              {[
                { icon: LayoutDashboard, label: "Dashboard", to: "/organizer" },
                { icon: Calendar, label: "Events", to: "/organizer" },
                { icon: Users, label: "Team", to: "/organizer/team", active: true },
                { icon: Palette, label: "Branding", to: "/organizer/branding" },
                { icon: Key, label: "API keys", to: "/organizer/api-keys" },
                { icon: BarChart3, label: "Analytics", to: "/organizer" },
                { icon: Wallet, label: "Financials", to: "/organizer" },
              ].map(({ icon: Icon, label, to, active }) => (
                <Link
                  key={label}
                  to={to}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-primary/12 text-primary border-r-2 border-primary" : "text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <Button className="w-full mt-8 rounded-2xl" asChild>
              <Link to="/organizer/events/new">+ New Event</Link>
            </Button>
            <div className="mt-8 space-y-2 border-t border-border/60 pt-6">
              <Link to="/help" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <HelpCircle className="h-4 w-4" />
                Help
              </Link>
              <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
                Logout
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between px-4 lg:px-8 py-4 border-b border-border/60 bg-background/80 backdrop-blur-sm">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 rounded-full bg-muted/50 border-0"
                placeholder="Search members or roles..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-2xl" disabled={!allowed}>
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add team member</DialogTitle>
                    <p className="text-sm text-muted-foreground">
                      The person must already have an KanamEvents account with this email. They will be able to manage your events
                      according to their role.
                    </p>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={inviteLoading}>
                      {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="icon" variant="ghost" className="rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full" asChild>
                <Link to="/settings">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-border" aria-hidden />
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                Dashboard &gt; Team Management
              </p>
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-bold font-headline">Team Management</h1>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {members.length} member{members.length !== 1 ? "s" : ""} on this portal
                  </p>
                  {!allowed && (
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
                      Team management requires Pro or Enterprise.{" "}
                      <Link to="/pricing" className="underline font-semibold">
                        Upgrade
                      </Link>
                    </p>
                  )}
                </div>
                <div className="flex rounded-full border border-border p-1 bg-muted/40">
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                      tab === "members" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setTab("members")}
                  >
                    All Members
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-full text-sm ${
                      tab === "invites" ? "bg-background shadow-sm font-semibold" : "text-muted-foreground"
                    }`}
                    onClick={() => setTab("invites")}
                  >
                    Invitations
                  </button>
                </div>
              </div>

              {tab === "invites" && (
                <Card className="rounded-3xl border-border/60 mb-8">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <p className="text-sm max-w-md mx-auto">
                      Pending email invites are not stored separately. Adding a member sends access immediately to an{" "}
                      <strong>existing</strong> KanamEvents account. For users without an account, ask them to sign up first, then add them
                      here.
                    </p>
                  </CardContent>
                </Card>
              )}

              {tab === "members" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 rounded-3xl border-border/60">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
                        <span className="font-semibold">Active Members</span>
                        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" type="button">
                          <Filter className="h-4 w-4" />
                          Filter Role
                        </Button>
                      </div>
                      {loading ? (
                        <div className="flex justify-center py-16 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {filtered.map((m) => {
                            const name = [m.firstName, m.lastName].filter(Boolean).join(" ").trim() || m.email || "Member";
                            const busy = actingId === m.userId;
                            const joined = m.joinedAt ? format(new Date(m.joinedAt), "MMM d, yyyy") : "—";
                            return (
                              <div key={m.id} className="px-6 py-4 flex flex-wrap items-center gap-4">
                                <div className="relative">
                                  <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-primary">
                                    {(name || "?")
                                      .split(/\s+/)
                                      .map((p) => p[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{name}</p>
                                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                                  <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">Join date {joined}</p>
                                </div>
                                <Badge variant="secondary" className={roleBadgeClass(m.role ?? "")}>
                                  {m.role}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="icon" variant="ghost" disabled={busy || !allowed}>
                                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleRoleChange(m.userId, "ADMIN")}>Make Admin</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(m.userId, "EDITOR")}>Make Editor</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(m.userId, "VIEWER")}>Make Viewer</DropdownMenuItem>
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleRemove(m.userId)}>
                                      Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {!loading && filtered.length === 0 && (
                        <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                          {allowed ? "No members match your search." : "Upgrade to Pro or Enterprise to add a team."}
                        </div>
                      )}
                      <div className="px-6 py-4 text-center border-t border-border/60">
                        <span className="text-sm font-semibold text-primary">
                          {members.length} active member{members.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="rounded-3xl border-border/60">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="font-semibold">Pending Invites</span>
                          <Badge variant="secondary">0</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">No pending invites. Use Invite Member to add collaborators.</p>
                        <Button
                          variant="outline"
                          className="w-full mt-4 rounded-2xl border-dashed"
                          onClick={() => setInviteOpen(true)}
                          disabled={!allowed}
                        >
                          + Invite New Member
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      <CardContent className="p-5">
                        <p className="text-sm font-semibold opacity-90">Access Overview</p>
                        <p className="text-2xl font-bold mt-2">
                          {members.length} / {seatCap}
                        </p>
                        <div className="h-2 rounded-full bg-white/20 mt-3 overflow-hidden">
                          <div
                            className="h-full bg-white/90 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (members.length / seatCap) * 100)}%` }}
                          />
                        </div>
                        <div className="flex gap-2 mt-4">
                          <div className="flex-1 rounded-xl bg-black/20 px-3 py-2 text-center text-xs font-bold">
                            {counts.admins} ADMINS
                          </div>
                          <div className="flex-1 rounded-xl bg-black/20 px-3 py-2 text-center text-xs font-bold">
                            {counts.editors} EDITORS
                          </div>
                        </div>
                        {counts.viewers > 0 && (
                          <p className="text-xs mt-2 opacity-90">{counts.viewers} viewer(s)</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              <button type="button" className="mt-8 text-sm text-muted-foreground flex items-center gap-2 hover:text-foreground mx-auto">
                <span className="inline-block h-3 w-3 rounded-full border border-current" />
                Suspended members are not tracked in this release
              </button>
            </motion.div>
          </main>
        </div>
      </div>
    </PageShell>
  );
};

export default TeamManagement;
