import { Navigate, Outlet, NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Calendar,
  TrendingUp,
  Plus,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Settings,
  LayoutGrid,
  Key,
  ScrollText,
  UserCog,
  Activity,
  Shield,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/roles-permissions", label: "Roles & permissions", icon: Shield },
  { to: "/admin/verification", label: "Verification", icon: ShieldCheck },
  { to: "/admin/events", label: "Events", icon: Calendar },
  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/admin/api-keys", label: "API Keys", icon: Key },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/event-reviewer-permissions", label: "Reviewer roles", icon: UserCog },
  { to: "/admin/system-health", label: "System Health", icon: Activity },
] as const;

/**
 * Wraps all admin pages. Ensures only users with ADMIN role can access.
 * Stitch-style shell: left sidebar + main column with search strip and outlet.
 */
const mobileNavItems = [
  { to: "/admin/overview", label: "Home", icon: LayoutGrid },
  { to: "/admin/api-keys", label: "Keys", icon: Key },
  { to: "/admin/audit-logs", label: "Logs", icon: ScrollText },
  { to: "/admin/revenue", label: "Revenue", icon: TrendingUp },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const AdminLayout = () => {
  const { user, isLoading, hasRole, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !hasRole("ADMIN")) {
    return <Navigate to="/" replace />;
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.email?.split("@")[0] || "Admin";

  return (
    <PageShell className="bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-border/60 bg-card/80 backdrop-blur-sm px-4 py-6">
          <Link to="/admin/overview" className="flex items-center gap-3 px-2 mb-8" aria-label="Kanam Events admin">
            <BrandLogo imgClassName="h-20 w-20" />
            <div className="min-w-0">
              <p className="font-headline font-bold text-foreground leading-tight truncate">KanamEvents</p>
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground truncate">ADMIN CONSOLE</p>
            </div>
          </Link>

          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <Button
            className="w-full rounded-full h-11 font-semibold shadow-md bg-gradient-primary hover:opacity-95"
            asChild
          >
            <Link to="/organizer/events/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New Event
            </Link>
          </Button>

          <div className="mt-6 pt-4 border-t border-border/60 flex flex-col gap-1">
            <Link
              to="/help"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg"
            >
              <HelpCircle className="h-4 w-4" />
              Support
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg text-left w-full"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex flex-col gap-4 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search platform…"
                  className="pl-10 h-11 rounded-full bg-primary/[0.06] border-primary/10 focus-visible:ring-primary/30"
                  aria-label="Search admin"
                />
              </div>
              <div className="flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                <Button variant="ghost" size="icon" className="rounded-full relative" asChild>
                  <Link to="/notifications" aria-label="Notifications">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full" asChild>
                  <Link to="/settings" aria-label="Settings">
                    <Settings className="h-5 w-5" />
                  </Link>
                </Button>
                <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                  <div className="text-right hidden sm:block min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate max-w-[140px]">{displayName}</p>
                  </div>
                  <Avatar className="h-9 w-9 ring-2 ring-primary/15">
                    {user.profilePictureUrl ? (
                      <AvatarImage src={user.profilePictureUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </header>

          <nav
            className="md:hidden flex gap-2 overflow-x-auto pb-2 px-4 -mb-2 border-b border-border/40 bg-background/90 [scrollbar-width:thin]"
            aria-label="Admin sections"
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 shrink-0 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap",
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  )
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 md:pb-8">
            <div className="max-w-[1400px] mx-auto">
              <Outlet />
            </div>
          </main>

          <nav
            className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur-md px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            aria-label="Admin mobile navigation"
          >
            <div className="flex max-w-lg mx-auto justify-between items-end gap-0.5 px-1">
              {mobileNavItems.map(({ to, label, icon: Icon }) => {
                const active =
                  to === "/admin/overview"
                    ? location.pathname === "/admin" || location.pathname.startsWith("/admin/overview")
                    : location.pathname === to || location.pathname.startsWith(`${to}/`);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    className={cn(
                      "flex flex-col items-center gap-1 py-1.5 px-1.5 rounded-xl min-w-0 flex-1 transition-colors",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                        active ? "bg-primary/12" : "bg-transparent"
                      )}
                    >
                      <Icon className="h-4 w-4" strokeWidth={active ? 2.25 : 2} />
                    </span>
                    <span className="text-[9px] font-semibold leading-none text-center max-w-[56px] truncate">{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </PageShell>
  );
};
