import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  PenLine,
  CalendarDays,
  Ticket,
  Star,
  BarChart3,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  Users,
  Palette,
  Key,
  TrendingUp,
  AlertCircle,
  Loader2,
  ShieldQuestion,
  Lock,
  ChevronRight,
  Heart,
  Bookmark,
  Bell,
  Settings,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { apiService } from "@/lib/api";
import type { FollowedOrganizer, OrganizerSummary } from "@/types/api";
import { IdentityCheckModal } from "@/components/IdentityCheckModal";
import { PageShell } from "@/components/PageShell";
import { toast } from "sonner";
import { getUserFacingApiError } from "@/lib/api-errors";

const VERIFIED_CELEBRATION_KEY = "profile_verified_celebration_shown";

const Profile = () => {
  const { user, hasRole, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [showVerifiedCelebration, setShowVerifiedCelebration] = useState(false);
  const [riskRefreshing, setRiskRefreshing] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [following, setFollowing] = useState<FollowedOrganizer[]>([]);
  const [ordersMeta, setOrdersMeta] = useState({ tickets: 0, orders: 0 });

  useEffect(() => {
    apiService
      .getFollowing()
      .then(setFollowing)
      .catch(() => setFollowing([]));
    apiService
      .getOrders(1, 100)
      .then((raw) => {
        const list = Array.isArray(raw) ? raw : [];
        let tickets = 0;
        list.forEach((o: Record<string, unknown>) => {
          const items = (o.tickets ?? o.orderItems) as { quantity?: number }[] | undefined;
          if (Array.isArray(items)) {
            items.forEach((t) => {
              tickets += typeof t.quantity === "number" ? t.quantity : 1;
            });
          }
        });
        setOrdersMeta({ tickets, orders: list.length });
      })
      .catch(() => setOrdersMeta({ tickets: 0, orders: 0 }));
  }, []);

  const fetchSummary = useCallback(() => {
    if (!hasRole("ORGANIZER")) {
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    apiService
      .getOrganizerSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [hasRole]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // After returning from Stripe Checkout, sync subscription from Stripe so tier + role update (even if webhooks missed)
  useEffect(() => {
    if (searchParams.get("subscription") !== "success") return;
    apiService
      .syncSubscriptionFromStripe()
      .then(({ message }) => {
        refreshUser();
        setSearchParams((prev) => {
          prev.delete("subscription");
          return prev;
        });
        if (message.toLowerCase().includes("synced") || message.toLowerCase().includes("tier=")) {
          toast.success("Subscription updated. You now have organizer access.");
        } else {
          toast.info(message);
        }
      })
      .catch(() => {
        toast.error("Could not sync subscription. Your payment may still have gone through.");
      });
  }, [searchParams, refreshUser, setSearchParams]);

  const isProOrEnterprise = user?.subscriptionTier === "PRO" || user?.subscriptionTier === "ENTERPRISE";

  // Real-time: refetch organizer stats when window regains focus (e.g. after ticket sale in another tab)
  useEffect(() => {
    if (!hasRole("ORGANIZER")) return;
    const onFocus = () => fetchSummary();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hasRole, fetchSummary]);

  // Fetch rejection reason when REJECTED (transparency for US users)
  useEffect(() => {
    if (!hasRole("ORGANIZER") || (user?.verificationStatus ?? "NOT_STARTED") !== "REJECTED") {
      setRejectionReason(null);
      return;
    }
    apiService.getVerificationStatus().then((res) => setRejectionReason(res.lastRejectionReason ?? null)).catch(() => setRejectionReason(null));
  }, [hasRole, user?.verificationStatus]);

  // One-time Verified celebration (vibrant green glow)
  useEffect(() => {
    const isVerifiedNow = Boolean(user?.isVerified) || user?.verificationStatus === "VERIFIED";
    if (!isVerifiedNow || !hasRole("ORGANIZER")) return;
    if (sessionStorage.getItem(VERIFIED_CELEBRATION_KEY)) return;
    setShowVerifiedCelebration(true);
    const t = setTimeout(() => {
      setShowVerifiedCelebration(false);
      sessionStorage.setItem(VERIFIED_CELEBRATION_KEY, "1");
    }, 3000);
    return () => clearTimeout(t);
  }, [user?.isVerified, user?.verificationStatus, hasRole]);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";
  const verificationStatus = user?.verificationStatus ?? "NOT_STARTED";
  const isVerified = Boolean(user?.isVerified) || verificationStatus === "VERIFIED";
  const verificationInProgress = verificationStatus === "PENDING" || verificationStatus === "IN_PROGRESS";
  const isEnterprise = user?.subscriptionTier === "ENTERPRISE";
  const isPro = user?.subscriptionTier === "PRO";
  const specialtyLabel = user?.culturalNiche
    ? `Focus: ${user.culturalNiche}`
    : hasRole("ORGANIZER")
      ? "Focus: Cultural & Community Events"
      : null;
  const riskFlagged = summary?.riskFlagged ?? false;
  const riskLevel = user?.riskLevel ?? summary?.riskLevel ?? "LOW";
  const isHighRisk = riskLevel === "HIGH";
  const payoutBalance = summary?.availableBalance ?? 0;
  const platformFeesWithheld = summary ? Number(summary.platformFeesWithheld ?? 0) : 0;

  const handleRecalculateRisk = useCallback(() => {
    if (!hasRole("ORGANIZER")) return;
    setRiskRefreshing(true);
    apiService
      .recalculateRiskScore()
      .then(() => {
        refreshUser();
        fetchSummary();
      })
      .finally(() => setRiskRefreshing(false));
  }, [hasRole, refreshUser, fetchSummary]);

  return (
    <PageShell>
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Hero — Stitch-style: member line, avatar, bio, stats, edit */}
          <Card
            className={`md:col-span-3 rounded-3xl border border-primary/10 overflow-hidden bg-gradient-to-br from-primary/[0.12] via-background to-primary-glow/[0.08] shadow-lg transition-all duration-500 ${
              showVerifiedCelebration ? "ring-4 ring-emerald-400/60 shadow-[0_0_40px_hsl(142_70%_45%_/_0.4)] animate-[pulse_1.5s_ease-in-out_2]" : ""
            }`}
          >
            <CardContent className="p-6 sm:p-8 space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
                Member since {user?.createdAt ? format(new Date(user.createdAt), "yyyy") : "—"}
              </p>
              <div className="flex flex-col lg:flex-row lg:items-start gap-8">
              <div className="relative shrink-0 mx-auto lg:mx-0">
                <input
                  ref={profilePhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setProfilePhotoUploading(true);
                    try {
                      await apiService.uploadProfilePicture(file);
                      await refreshUser();
                      toast.success("Profile picture updated.");
                    } catch (err: unknown) {
                      toast.error(getUserFacingApiError(err, "Failed to upload profile picture."));
                    } finally {
                      setProfilePhotoUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <Avatar className="h-28 w-28 ring-4 ring-primary/40 ring-offset-4 ring-offset-background shadow-lg shadow-[0_0_24px_hsl(var(--primary)_/_0.35)]">
                  <AvatarImage src={user?.profilePictureUrl} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-3xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full h-9 w-9 p-0 shadow-md"
                  disabled={profilePhotoUploading}
                  onClick={() => profilePhotoInputRef.current?.click()}
                >
                  {profilePhotoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-foreground">
                    {displayName}
                  </h1>
                  {(isPro || isEnterprise) && (
                    <Badge className="bg-primary text-primary-foreground border-0 uppercase text-[10px] tracking-wider">
                      {isEnterprise ? "Enterprise" : "Pro"} member
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                {user?.bio ? (
                  <p className="text-sm text-foreground/90 mt-3 leading-relaxed max-w-xl">{user.bio}</p>
                ) : null}
                {specialtyLabel ? (
                  <p className={`text-sm text-muted-foreground ${user?.bio ? "mt-2" : "mt-3"}`}>{specialtyLabel}</p>
                ) : null}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 max-w-lg mx-auto sm:mx-0">
                  <div className="rounded-2xl bg-background/70 dark:bg-background/40 border border-border/60 px-3 py-3 text-center">
                    <p className="text-2xl font-bold font-headline tabular-nums">{ordersMeta.tickets}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Tickets</p>
                  </div>
                  <div className="rounded-2xl bg-background/70 dark:bg-background/40 border border-border/60 px-3 py-3 text-center">
                    <p className="text-2xl font-bold font-headline tabular-nums">{ordersMeta.orders}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Orders</p>
                  </div>
                  <div className="rounded-2xl bg-background/70 dark:bg-background/40 border border-border/60 px-3 py-3 text-center">
                    <p className="text-2xl font-bold font-headline tabular-nums">{following.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mt-1">Following</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                  <Badge className="bg-primary/90 text-primary-foreground border-0 shadow-[0_0_14px_hsl(var(--primary)_/_0.5)]">
                    {user?.role ?? "USER"}
                  </Badge>
                  {hasRole("ORGANIZER") ? (
                    isVerified ? (
                      <Badge className="bg-emerald-500/90 text-white border-0 shadow-[0_0_12px_hsl(142_70%_45%_/_0.5)] inline-flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </Badge>
                    ) : verificationInProgress ? (
                      <Badge className="bg-amber-500/90 text-white border-0 shadow-[0_0_12px_hsl(38_92%_50%_/_0.5)] inline-flex items-center gap-1 animate-pulse ring-2 ring-amber-400/30 ring-offset-2 ring-offset-background">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Verification in Progress
                      </Badge>
                    ) : verificationStatus === "REJECTED" ? (
                      <Badge className="bg-red-500/90 text-white border-0 shadow-[0_0_12px_hsl(0_84%_50%_/_0.5)] inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Verification declined
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/80 text-white border-0 shadow-[0_0_12px_hsl(38_92%_50%_/_0.5)] inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Pending Verification
                      </Badge>
                    )
                  ) : (
                    <Badge className="bg-emerald-400 text-white border-0 shadow-[0_0_12px_hsl(142_70%_45%_/_0.5)]">
                      {user?.status ?? "ACTIVE"}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-6">
                <Button
                  className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-0 shadow-md hover:shadow-glow hover:scale-[1.02] transition-all rounded-2xl px-8"
                  onClick={() => navigate("/profile/edit")}
                >
                  <PenLine className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                </div>
                {hasRole("ORGANIZER") && !isVerified && !verificationInProgress && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 ml-0 sm:ml-2 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => setIdentityModalOpen(true)}
                  >
                    {verificationStatus === "REJECTED" ? "Resubmit verification" : "Complete Identity Check"}
                  </Button>
                )}
              </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="md:col-span-3 rounded-3xl border-border/60 bg-card/90 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to="/orders"
                  className="group rounded-2xl border border-border/60 bg-muted/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col gap-2"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Ticket className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">My orders</p>
                  <p className="text-xs text-muted-foreground">Upcoming events and ticket history</p>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1 mt-1">
                    Manage tickets <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link
                  to="/profile/following"
                  className="group rounded-2xl border border-border/60 bg-muted/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col gap-2"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Following</p>
                  <p className="text-xs text-muted-foreground">Organizers and venues you follow</p>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1 mt-1">
                    {following.length} organizers <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
                <Link
                  to="/events"
                  className="group rounded-2xl border border-border/60 bg-muted/30 p-4 hover:border-primary/40 hover:bg-primary/5 transition-colors flex flex-col gap-2"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Bookmark className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Discover events</p>
                  <p className="text-xs text-muted-foreground">Browse and save events you love</p>
                  <span className="text-sm font-semibold text-primary flex items-center gap-1 mt-1">
                    Explore <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 rounded-3xl border-border/60 bg-card/90 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Following feed</p>
                <Link to="/profile/following" className="text-sm font-semibold text-primary flex items-center gap-0.5">
                  View all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
              {following.length === 0 ? (
                <p className="text-sm text-muted-foreground">You are not following any organizers yet.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {following.map((f) => {
                    const organizerName = [f.firstName, f.lastName].filter(Boolean).join(" ") || "Organizer";
                    return (
                    <div
                      key={f.organizerId}
                      className="flex flex-col items-center gap-1 shrink-0 w-[72px]"
                    >
                      <Avatar className="h-14 w-14 ring-2 ring-primary/20">
                        <AvatarImage src={f.profilePictureUrl ?? undefined} alt={organizerName} />
                        <AvatarFallback className="text-xs bg-primary/10">
                          {organizerName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] text-center text-muted-foreground line-clamp-2 leading-tight w-full">
                        {organizerName}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-3 rounded-3xl border-border/60 bg-card/90 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Account</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/profile/edit")}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="font-semibold">Edit profile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Name, bio, and personal details</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <Settings className="h-4 w-4" /> Security
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Password and account preferences</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/notifications")}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4" /> Notifications
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Event updates and reminders</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/help")}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 text-left hover:border-primary/30 hover:bg-primary/5 transition-colors"
                >
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" /> Help &amp; support
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">FAQs and contact</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </button>
              </div>
            </CardContent>
          </Card>

          <IdentityCheckModal
            open={identityModalOpen}
            onOpenChange={setIdentityModalOpen}
            onSuccess={() => refreshUser()}
          />

          {/* Rejected state: clear reason + Resubmit (US transparency) */}
          {hasRole("ORGANIZER") && verificationStatus === "REJECTED" && (
            <Card className="md:col-span-3 rounded-xl border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Verification declined</p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {(user?.rejectionReason ?? rejectionReason)
                      ? (user?.rejectionReason ?? rejectionReason)
                      : "We couldn’t verify your information. Common reasons: address doesn’t match ID, or document couldn’t be read. Please resubmit with correct details."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/50 text-red-700 dark:text-red-300 hover:bg-red-500/10 shrink-0"
                  onClick={() => setIdentityModalOpen(true)}
                >
                  Resubmit verification
                </Button>
              </CardContent>
            </Card>
          )}

          {/* High risk warning */}
          {hasRole("ORGANIZER") && isHighRisk && (
            <Card className="md:col-span-3 rounded-xl border-amber-500/40 bg-amber-500/10">
              <CardContent className="p-4 flex items-center gap-3">
                <ShieldQuestion className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">High risk designation</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your account has additional review requirements. Payouts may be delayed. Contact support for details.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payout risk + eligibility (organizers only) */}
          {hasRole("ORGANIZER") && (
            <Card className="rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payout risk</p>
                    <p className="font-medium capitalize">{riskLevel.toLowerCase()}</p>
                    {summary?.payoutEligibility?.label && (
                      <p className="text-sm text-muted-foreground mt-0.5">{summary.payoutEligibility.label}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalculateRisk}
                  disabled={riskRefreshing}
                >
                  {riskRefreshing ? "Updating…" : "Refresh"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Current Tier (Hybrid Pricing Model) */}
          {hasRole("ORGANIZER") && (
            <Card className="rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md md:col-span-2">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Current tier</p>
                {isPro || isEnterprise ? (
                  <div>
                    <p className="font-semibold text-primary">KanamEvents Pro</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lower fees · Instant payouts · Manage team and branding under Organizer
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-primary p-0 h-auto font-medium"
                      onClick={() => navigate("/pricing")}
                    >
                      Manage plan <ChevronRight className="h-4 w-4 ml-0.5 inline" />
                    </Button>
                    {isEnterprise ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 text-primary p-0 h-auto font-medium block"
                        onClick={() => navigate("/enterprise/subscription")}
                      >
                        Enterprise subscription <ChevronRight className="h-4 w-4 ml-0.5 inline" />
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold">Starter</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Standard fees · 3-day payouts
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-primary border-primary/50 hover:bg-primary/10"
                      onClick={() => navigate("/pricing")}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Privacy & CCPA */}
          <Card
            className="rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
            onClick={() => navigate("/privacy")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Data & Privacy</p>
                <p className="font-medium text-sm">View data we collect · Request deletion</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>

          {/* Organizer tools: team & branding live under /organizer/* (not duplicated on Profile) */}
          {hasRole("ORGANIZER") && isProOrEnterprise && (
            <Card
              className="md:col-span-3 rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => navigate("/organizer/team")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/organizer/team")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizer</p>
                  <p className="font-medium">Team management</p>
                  <p className="text-sm text-muted-foreground">Invite people, set roles, and manage access — opens the organizer hub</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )}

          {hasRole("ORGANIZER") && isEnterprise && (
            <Card
              className="md:col-span-3 rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => navigate("/organizer/branding")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/organizer/branding")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizer</p>
                  <p className="font-medium">White-label branding</p>
                  <p className="text-sm text-muted-foreground">Logo, colors, and footer on public pages — configure in the branding workspace</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )}

          {hasRole("ORGANIZER") && isEnterprise && (
            <Card
              className="md:col-span-3 rounded-xl border-0 bg-white/70 dark:bg-white/10 backdrop-blur-[10px] shadow-md cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => navigate("/organizer/api-keys")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/organizer/api-keys")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organizer</p>
                  <p className="font-medium">API keys</p>
                  <p className="text-sm text-muted-foreground">Create and revoke keys for programmatic access — managed in the organizer hub</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )}

          {/* Your Impact - Organizer only */}
          {hasRole("ORGANIZER") && (
            <Card className="md:col-span-3 rounded-2xl border-0 bg-white/60 dark:bg-white/5 backdrop-blur-[10px] shadow-md">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <span className="w-2 h-8 rounded-full bg-gradient-to-b from-primary to-primary-glow" />
                  Your Impact
                </h2>
                {/* Payout balance (after platform fees) */}
                {!summaryLoading && (
                  <div className="mb-4 rounded-xl bg-white/80 dark:bg-white/10 px-4 py-3 border border-primary/10 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">
                        Available for payout{platformFeesWithheld > 0 ? " (after platform fees)" : ""}
                      </span>
                      {platformFeesWithheld > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Platform fees withheld: ${platformFeesWithheld.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <span className="text-xl font-bold text-foreground">
                      ${typeof payoutBalance === "number" ? payoutBalance.toFixed(2) : "0.00"}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-white/80 dark:bg-white/10 p-4 border border-primary/10">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Events Hosted</span>
                    </div>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {summary?.eventsHosted ?? 0}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-white/10 p-4 border border-primary/10">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Tickets Sold</span>
                      {summary?.ticketsSoldTrendPercent != null && summary.ticketsSoldTrendPercent > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +{summary.ticketsSoldTrendPercent}% this week
                        </span>
                      )}
                    </div>
                    {summaryLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground">
                        {summary?.ticketsSold ?? 0}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-white/10 p-4 border border-primary/10">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Star className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Rating</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">4.9</p>
                  </div>
                </div>
                {/* Financial: balance placeholder + CTAs */}
                {summaryLoading ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Skeleton className="h-9 w-40" />
                    <Skeleton className="h-9 w-36" />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-primary border-primary/50 hover:bg-primary/10"
                      onClick={() => navigate("/organizer")}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Detailed Analytics
                    </Button>
                    {riskFlagged ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="border-amber-500/50 text-amber-700 dark:text-amber-400"
                        onClick={() => navigate("/organizer")}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Review Required
                      </Button>
                    ) : !isVerified ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-muted-foreground border-muted cursor-not-allowed"
                        onClick={() => {}}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Manage Payouts (verify first)
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary/50 hover:bg-primary/10"
                        onClick={() => navigate("/organizer")}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Manage Payouts
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </PageShell>
  );
};

export default Profile;
