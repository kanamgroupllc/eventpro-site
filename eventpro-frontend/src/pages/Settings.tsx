import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferences } from "@/contexts/PreferencesContext";
import { Link } from "react-router-dom";
import { apiService } from "@/lib/api";
import {
  LogOut,
  Trash2,
  Palette,
  Shield,
  User,
  Mail,
  HelpCircle,
  FileText,
  CreditCard,
  Ticket,
  ChevronRight,
  Bell,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import type { WalletBalance, WalletLedgerEntry } from "@/types/api";

const Settings = () => {
  const { logout, isAuthenticated } = useAuth();
  const { clearRecentlyViewed, notificationPreferences, setNotificationPreferences } = usePreferences();
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [walletLedger, setWalletLedger] = useState<WalletLedgerEntry[]>([]);
  const [walletLoading, setWalletLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setWalletLoading(true);
    Promise.all([apiService.getWallet(), apiService.getWalletLedger(0, 8)])
      .then(([balance, ledgerPage]) => {
        setWalletBalance(balance);
        setWalletLedger(ledgerPage.content ?? []);
      })
      .catch(() => {
        setWalletBalance({ balance: 0, currency: "USD" });
        setWalletLedger([]);
      })
      .finally(() => setWalletLoading(false));
  }, [isAuthenticated]);

  // Sync in-app preference from API when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    setPrefsLoading(true);
    apiService
      .getMyNotificationPreferences()
      .then((p) => setNotificationPreferences({ inAppNotifications: p.pushEnabled }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [isAuthenticated]);

  const handleInAppChange = async (v: boolean) => {
    setNotificationPreferences({ inAppNotifications: v });
    if (!isAuthenticated) return;
    try {
      await apiService.updateMyNotificationPreferences({ pushEnabled: v });
    } catch {
      setNotificationPreferences({ inAppNotifications: !v });
    }
  };

  return (
    <PageShell>
      <div className="container mx-auto px-4 max-w-2xl py-8 md:py-10">
        <h1 className="text-4xl font-extrabold font-headline tracking-tight mb-8 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          Settings
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick links */}
          <Card className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <User className="h-5 w-5 text-primary" />
                Account
              </CardTitle>
              <CardDescription>Profile, orders, and subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/profile/edit">
                  Edit profile
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/orders">
                  <span className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    Order history
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/pricing">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pricing & subscription
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {isAuthenticated && (
            <Card id="electric-wallet" className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                  Electric Wallet
                </CardTitle>
                <CardDescription>
                  Store credit from refunds — apply at checkout on your next purchase.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-primary/15 bg-primary/8 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Available balance
                  </p>
                  <p className="text-3xl font-extrabold tabular-nums text-foreground">
                    {walletLoading
                      ? "…"
                      : `$${(walletBalance?.balance ?? 0).toFixed(2)}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {walletBalance?.currency ?? "USD"} · Credits appear when an order is refunded
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Recent activity</p>
                  {walletLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : walletLedger.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No wallet activity yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {walletLedger.map((entry) => (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {entry.description ?? entry.referenceType.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.createdAt
                                ? format(new Date(entry.createdAt), "MMM d, yyyy · h:mm a")
                                : "—"}
                            </p>
                          </div>
                          <span
                            className={`font-bold tabular-nums shrink-0 ${
                              entry.entryType === "CREDIT" ? "text-emerald-600" : "text-foreground"
                            }`}
                          >
                            {entry.entryType === "CREDIT" ? "+" : "−"}${entry.amount.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/orders">Use credits at checkout</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notifications */}
          <Card id="notifications" className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Notifications
              </CardTitle>
              <CardDescription>
                {isAuthenticated
                  ? "In-app preference is saved to your account. Email toggles are stored on this device."
                  : "Choose how we contact you. Sign in to sync in-app preference to your account."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order confirmations (email)</p>
                  <p className="text-sm text-muted-foreground">Receive a confirmation when you purchase tickets</p>
                </div>
                <Switch
                  checked={notificationPreferences.emailOrderConfirmations}
                  onCheckedChange={(v) => setNotificationPreferences({ emailOrderConfirmations: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing & tips (email)</p>
                  <p className="text-sm text-muted-foreground">News, offers, and event recommendations</p>
                </div>
                <Switch
                  checked={notificationPreferences.emailMarketing}
                  onCheckedChange={(v) => setNotificationPreferences({ emailMarketing: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Event reminders (email)</p>
                  <p className="text-sm text-muted-foreground">Reminders before events you’re attending</p>
                </div>
                <Switch
                  checked={notificationPreferences.emailEventReminders}
                  onCheckedChange={(v) => setNotificationPreferences({ emailEventReminders: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">In-app notifications</p>
                  <p className="text-sm text-muted-foreground">Notifications inside the app when you’re logged in</p>
                </div>
                <Switch
                  checked={notificationPreferences.inAppNotifications}
                  onCheckedChange={handleInAppChange}
                  disabled={prefsLoading}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                To opt out of marketing entirely, turn off &quot;Marketing & tips&quot; above. For more choices, see our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy page</Link>.
              </p>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how KanamEvents looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark mode
                  </p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Support
              </CardTitle>
              <CardDescription>Get help or get in touch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/help">
                  Help center
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/contact">
                  <span className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Contact us
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button variant="ghost" className="w-full justify-between" asChild>
                <Link to="/privacy">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Data & privacy
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Privacy */}
          <Card className="rounded-2xl border-border/60 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline text-lg">
                <Shield className="h-5 w-5 text-primary" />
                Privacy
              </CardTitle>
              <CardDescription>Manage your data on this device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Recently viewed events</p>
                  <p className="text-sm text-muted-foreground">
                    Clear your recently viewed events list
                  </p>
                </div>
                <Button variant="outline" onClick={clearRecentlyViewed}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sign out */}
          <Card className="rounded-2xl border-destructive/20 shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
            <CardContent className="pt-6">
              <Button
                variant="destructive"
                onClick={logout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageShell>
  );
};

export default Settings;
