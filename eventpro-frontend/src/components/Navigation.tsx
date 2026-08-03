import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Ticket, Calendar, User as UserIcon, ShoppingBag, LogOut, Settings, Shield, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { CartMenu } from "@/components/CartMenu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandLogo } from "@/components/BrandLogo";

export const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const { isAuthenticated, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setNavSearch(params.get("q") ?? "");
  }, [location.pathname, location.search]);

  const navLinks = [
    { path: "/", label: "Home", icon: Calendar },
    { path: "/events", label: "Events", icon: Ticket },
  ];

  if (isAuthenticated) {
    navLinks.push({ path: "/orders", label: "My Orders", icon: ShoppingBag });
    navLinks.push({ path: "/profile/following", label: "Following", icon: Heart });
    navLinks.push({ path: "/profile", label: "Profile", icon: UserIcon });
  }

  const submitNavSearch = () => {
    const q = navSearch.trim();
    if (q) navigate(`/events?q=${encodeURIComponent(q)}`);
    else navigate("/events");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/85 dark:bg-background/90 backdrop-blur-xl shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4 min-h-[5.5rem] md:min-h-[6.5rem] py-2 md:py-0">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="Kanam Events home">
            <BrandLogo imgClassName="h-24 w-24 md:h-28 md:w-28" />
          </Link>

          {/* Desktop: search (Stitch discovery_web) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), submitNavSearch())}
                placeholder="Search events..."
                className="h-10 pl-9 pr-3 rounded-full border-0 bg-background/80 dark:bg-secondary/80 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/25"
                aria-label="Search events"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6 shrink-0">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative flex items-center gap-2 px-3 py-2 pb-4 rounded-lg transition-colors ${
                    active
                      ? "text-primary font-semibold after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:h-[3px] after:w-8 after:rounded-full after:bg-gradient-to-r after:from-primary after:to-primary-glow after:shadow-[0_0_10px_hsl(var(--primary)_/_0.8)] before:absolute before:bottom-[-5px] before:left-1/2 before:-translate-x-1/2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary before:shadow-[0_0_6px_hsl(var(--primary)_/_0.9)]"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <LanguageSwitcher />
            <ThemeToggle />

            <CartMenu />
            {isAuthenticated && <NotificationCenter />}

            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <Button
                size="sm"
                className="bg-gradient-primary"
                onClick={() => navigate("/login")}
              >
                Login
              </Button>
            )}
          </div>

          <button
            type="button"
            onClick={() => navigate("/events")}
            className="md:hidden p-2 rounded-full text-primary hover:bg-secondary/80 ml-auto"
            aria-label="Go to events search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-secondary shrink-0"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      active
                        ? "text-primary font-semibold bg-primary/10 border-l-4 border-primary"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })}

              <div className="flex items-center justify-between px-4 py-2">
                <CartMenu />
                {isAuthenticated && <NotificationCenter />}
              </div>

              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Language</span>
                  <LanguageSwitcher />
                </div>
              </div>

              {isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive("/settings")
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <Settings className="h-5 w-5" />
                    Settings
                  </Link>

                  {hasRole("ADMIN") && (
                    <Link
                      to="/admin"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive("/admin")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <Shield className="h-5 w-5" />
                      Admin Dashboard
                    </Link>
                  )}

                  {(hasRole("ORGANIZER") || hasRole("ADMIN")) && (
                    <Link
                      to="/organizer"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive("/organizer")
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-secondary"
                      }`}
                    >
                      <Calendar className="h-5 w-5" />
                      Organizer Dashboard
                    </Link>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => {
                      logout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-gradient-primary"
                  onClick={() => {
                    navigate("/login");
                    setIsOpen(false);
                  }}
                >
                  Login
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
