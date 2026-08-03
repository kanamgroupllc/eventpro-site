import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PageShell } from "@/components/PageShell";
import { motion } from "framer-motion";
import {
  Infinity,
  Megaphone,
  Banknote,
  Users,
  CreditCard,
  Sparkles,
  LayoutDashboard,
  Layers,
  BarChart3,
  FileText,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  ExternalLink,
} from "lucide-react";

const SIDEBAR_LINKS = [
  { to: "/organizer", label: "Overview", icon: LayoutDashboard },
  { to: "/enterprise/subscription", label: "Subscriptions", icon: Layers, active: true },
  { to: "#usage", label: "Usage", icon: BarChart3 },
  { to: "#invoices", label: "Invoices", icon: FileText },
  { to: "/admin/api-keys", label: "API Keys", icon: KeyRound, adminOnly: true },
] as const;

/**
 * Enterprise subscription hub — billing is handled outside the app (contracts / account team).
 * No dummy renewal dates, cards, or invoices; only real account context from auth.
 */
const EnterpriseSubscription = () => {
  const { user, logout } = useAuth();
  const isEnterprise = user?.subscriptionTier === "ENTERPRISE";
  const isAdmin = user?.role === "ADMIN";

  const orgLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email?.split("@")[0] ||
    "Your organization";
  const orgInitials = (() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean) as string[];
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (user?.email?.slice(0, 2) ?? "EP").toUpperCase();
  })();

  return (
    <PageShell>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        {/* Sidebar — desktop Stitch enterprise nav */}
        <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="p-6 lg:sticky lg:top-0">
            <p className="text-xs font-bold tracking-widest text-foreground uppercase">Enterprise Portal</p>
            <p className="text-sm text-muted-foreground mt-1">Premium Tier</p>
            <nav className="mt-8 space-y-1">
              {SIDEBAR_LINKS.filter((l) => !("adminOnly" in l && l.adminOnly) || isAdmin).map(({ to, label, icon: Icon, ...rest }) => {
                const active = "active" in rest && rest.active;
                return (
                  <Link
                    key={label}
                    to={to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <Button className="w-full mt-8 rounded-2xl" asChild>
              <Link to="/pricing">Upgrade Plan</Link>
            </Button>
            <div className="mt-6 space-y-1 border-t border-border/60 pt-6">
              <Link
                to="/help"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <LifeBuoy className="h-4 w-4" />
                Support
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="container mx-auto px-4 py-8 lg:px-10 lg:py-10 max-w-6xl pb-24">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {!isEnterprise ? (
                <Card className="rounded-3xl border-border/60 max-w-lg">
                  <CardContent className="p-6 text-center space-y-4">
                    <Sparkles className="h-10 w-10 mx-auto text-primary" />
                    <p className="text-muted-foreground text-sm">
                      Subscription management and invoicing are available on the Enterprise plan.
                    </p>
                    <Button asChild className="rounded-2xl">
                      <Link to="/pricing">View plans</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-500 mb-2">Account billing</p>
                      <h1 className="text-3xl font-bold font-headline tracking-tight text-foreground">Subscription Management</h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground hidden sm:inline">Organization:</span>
                      <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{orgLabel}</span>
                      <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <span className="text-primary-foreground text-xs font-bold">{orgInitials}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
                    <Card className="xl:col-span-2 rounded-3xl border-0 bg-gradient-to-br from-primary via-primary to-primary-glow text-primary-foreground shadow-lg overflow-hidden">
                      <CardContent className="p-8 relative">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <Badge className="bg-white/20 text-primary-foreground border-0 gap-1.5 mb-4">
                              <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                              Active — Enterprise
                            </Badge>
                            <p className="text-3xl md:text-4xl font-bold font-headline italic mb-2">Enterprise Suite</p>
                            <p className="text-primary-foreground/90 text-sm max-w-md">
                              Renewal terms, pricing, and invoicing are managed with your Enterprise agreement (not shown in-app).
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-5 py-4 text-sm min-w-[200px]">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/80 mb-1">Account</p>
                            <p className="font-semibold break-all">{user?.email}</p>
                            <p className="text-xs text-primary-foreground/80 mt-2">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-border/60">
                      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Account team</p>
                          <p className="text-xs text-muted-foreground">Billing and contract changes go through your KanamEvents contact</p>
                        </div>
                        <Button variant="secondary" className="w-full rounded-2xl gap-2" asChild>
                          <Link to="/contact">
                            <Mail className="h-4 w-4" />
                            Contact sales & support
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-4">Enterprise perks</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
                    {[
                      {
                        icon: Infinity,
                        title: "Unlimited Events",
                        body: "Host unlimited shows without per-event platform fees.",
                      },
                      {
                        icon: Megaphone,
                        title: "White-label Branding",
                        body: "Your brand, your domain, full control of the experience.",
                      },
                      {
                        icon: Banknote,
                        title: "100% Instant Payouts",
                        body: "Revenue flows directly to your bank with minimal delay.",
                      },
                      {
                        icon: Users,
                        title: "Team Roles",
                        body: "Granular permissions for marketing, finance, and onsite teams.",
                      },
                    ].map(({ icon: Icon, title, body }) => (
                      <Card key={title} className="rounded-2xl border-border/60">
                        <CardContent className="p-5">
                          <Icon className="h-6 w-6 text-primary mb-3" />
                          <p className="font-semibold text-foreground text-sm mb-1">{title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-3">Payment method</p>
                      <Card className="rounded-2xl border-border/60 bg-primary/5">
                        <CardContent className="p-5 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-10 w-10 text-muted-foreground shrink-0" />
                            <p className="text-sm text-muted-foreground">
                              Enterprise billing is handled per contract. To update payment details or request invoices, contact
                              support — we do not store card data for Enterprise in this app.
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="w-fit rounded-xl" asChild>
                            <Link to="/contact">Contact billing</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-foreground">Billing history</p>
                      </div>
                      <Card className="rounded-2xl border-border/60 overflow-hidden">
                        <CardContent className="p-6 text-sm text-muted-foreground">
                          Invoices are not listed in the product yet. Request copies or payment history from{" "}
                          <Link to="/contact" className="text-primary font-medium underline">
                            support
                          </Link>
                          .
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <Card className="rounded-2xl border-0 bg-gradient-to-r from-primary/10 to-primary-glow/10 mt-10 p-6">
                    <p className="font-semibold text-foreground mb-1">Need more scale?</p>
                    <p className="text-sm text-muted-foreground mb-4 flex flex-wrap items-center gap-2">
                      Enterprise APIs and custom contracts — talk to your account team.
                      <ExternalLink className="h-3.5 w-3.5 inline opacity-60" aria-hidden />
                    </p>
                    <Button variant="outline" className="rounded-2xl bg-background" asChild>
                      <Link to="/contact">Contact account manager</Link>
                    </Button>
                  </Card>
                </>
              )}
            </motion.div>
          </div>
        </main>
      </div>
    </PageShell>
  );
};

export default EnterpriseSubscription;
