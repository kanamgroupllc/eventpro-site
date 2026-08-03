import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Palette,
  Briefcase,
  LayoutGrid,
  Calendar,
  Users,
  Key,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Bell,
  Info,
  Loader2,
} from "lucide-react";
import { apiService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Event, TicketType } from "@/types/api";
import { getEventImageUrl } from "@/lib/utils";

function formatVenueLine(ev: Event): string {
  const parts = [ev.venue, ev.addressCity, ev.addressState].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (ev.addressStreet) return ev.addressStreet;
  return "Location TBA";
}

/** Prefer next published upcoming event; else most recent published; else any event. */
function pickPreviewEvent(events: Event[]): Event | null {
  if (!events.length) return null;
  const published = events.filter((e) => e.status === "PUBLISHED" || !e.status);
  const list = published.length ? published : events;
  const now = new Date();
  const upcoming = list
    .filter((e) => new Date(e.startTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  if (upcoming.length) return upcoming[0];
  return [...list].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];
}

const OrganizerBranding = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0A66F0");
  const [hideFooter, setHideFooter] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
  const [previewTickets, setPreviewTickets] = useState<TicketType[]>([]);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [logoPreviewError, setLogoPreviewError] = useState(false);

  const tier = (user?.subscriptionTier ?? "BASIC").toUpperCase();
  const enterprise = tier === "ENTERPRISE";

  const applyServerData = useCallback(async () => {
    const [u, evs] = await Promise.all([
      apiService.getCurrentUser(),
      apiService.getOrganizerEvents().catch(() => [] as Event[]),
    ]);
    setPrimaryColor(u.brandingPrimaryColor?.trim() || "#0A66F0");
    setHideFooter(Boolean(u.brandingHidePlatform));
    setLogoUrl(u.brandingLogoUrl ?? "");
    const picked = pickPreviewEvent(evs);
    setPreviewEvent(picked);
    setPreviewImageError(false);
    setLogoPreviewError(false);
    if (picked) {
      try {
        const types = await apiService.getTicketTypes(picked.id);
        const active = types.filter((t) => t.status === "ACTIVE");
        setPreviewTickets(active.slice(0, 2));
      } catch {
        setPreviewTickets([]);
      }
    } else {
      setPreviewTickets([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await applyServerData();
      } catch {
        if (!cancelled) toast({ title: "Could not load branding", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerData, toast]);

  const discardChanges = async () => {
    setResetting(true);
    try {
      await applyServerData();
      toast({ title: "Reverted to saved settings" });
    } catch {
      toast({ title: "Could not reload saved settings", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const publish = async () => {
    if (!enterprise) {
      toast({
        title: "Enterprise required",
        description: "White-label branding is available on the Enterprise plan.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await apiService.updateUser({
        brandingPrimaryColor: primaryColor.trim() || null,
        brandingHidePlatform: hideFooter,
        brandingLogoUrl: logoUrl.trim() || null,
      });
      await refreshUser();
      toast({ title: "Branding saved", description: "Your public event pages will reflect these settings." });
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Could not save branding";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewColor = primaryColor.match(/^#[0-9A-Fa-f]{6}$/) ? primaryColor : "#0A66F0";
  const eventHeroUrl = previewEvent ? getEventImageUrl(previewEvent.imageUrl) : undefined;
  const eventTitle = previewEvent?.name?.trim() || previewEvent?.title?.trim() || "Untitled event";
  const eventStart = previewEvent?.startTime
    ? new Date(previewEvent.startTime)
    : null;
  const dateLine =
    eventStart && !Number.isNaN(eventStart.getTime())
      ? `${format(eventStart, "MMM d").toUpperCase()} · ${format(eventStart, "h:mm a")}`
      : "Date TBA";

  const logoHttps = logoUrl.trim().startsWith("https://") || logoUrl.trim().startsWith("http://");

  return (
    <PageShell>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row">
        <aside className="w-full lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-card/90">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold">Enterprise Suite</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Admin console</p>
              </div>
            </div>
            <nav className="space-y-1 text-sm">
              <Link to="/organizer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <LayoutGrid className="h-4 w-4" />
                Dashboard
              </Link>
              <Link to="/organizer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Calendar className="h-4 w-4" />
                Events
              </Link>
              <Link to="/organizer/team" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Users className="h-4 w-4" />
                Team
              </Link>
              <span className="flex items-center gap-2 rounded-xl px-3 py-2 bg-primary/12 text-primary font-medium">
                <Palette className="h-4 w-4" />
                Branding
              </span>
              <Link to="/organizer/api-keys" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Key className="h-4 w-4" />
                API keys
              </Link>
              <Link
                to="/organizer#organizer-financial"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80"
              >
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Link>
              <Link to="/settings" className="flex items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground hover:bg-muted/80">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </nav>
            <div className="pt-6 border-t border-border/60 space-y-2 text-sm text-muted-foreground">
              <Link to="/help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Support
              </Link>
              <Link to="/login" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Link>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-10 max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Organizer Hub | Branding configuration
              </p>
              <h1 className="text-3xl font-bold font-headline mt-1">Enterprise Branding</h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Customize the look and feel of your event ecosystem. Enterprise tier can set logo URL, primary color, and hide the
                platform footer on public ticket pages.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="rounded-2xl"
                type="button"
                onClick={() => void discardChanges()}
                disabled={loading || resetting || saving}
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Discard changes"}
              </Button>
              <Button className="rounded-2xl" disabled={loading || saving || resetting} onClick={() => void publish()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish branding"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                type="button"
                onClick={() => navigate("/notifications")}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {!enterprise && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">
              Branding fields apply to <strong>Enterprise</strong> accounts.{" "}
              <Link to="/pricing" className="underline font-semibold">
                View plans
              </Link>
              . You can still edit values below; the API will only persist them when your account is Enterprise.
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-24 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-6">
                <Card className="rounded-3xl border-border/60">
                  <CardContent className="p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <Palette className="h-5 w-5 text-primary" />
                      Brand identity logo
                    </h2>
                    <label className="text-sm font-medium">Logo image URL</label>
                    <Input
                      className="mt-2 rounded-xl"
                      placeholder="https://your-cdn.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoPreviewError(false);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Paste a publicly reachable HTTPS URL. Recommended ~400×120px, transparent PNG or SVG.
                    </p>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-border/60">
                  <CardContent className="p-6 space-y-6">
                    <h2 className="font-semibold">Brand palette & visibility</h2>
                    <div>
                      <label className="text-sm font-medium">Primary brand color</label>
                      <div className="flex gap-3 mt-2 items-center">
                        <div className="h-10 w-10 rounded-lg border border-border" style={{ backgroundColor: previewColor }} />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="max-w-[140px] rounded-xl font-mono text-sm"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Used for buttons, links, and accents on public pages.</p>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-2 border-t border-border/40">
                      <div>
                        <p className="font-medium">Hide KanamEvents footer</p>
                        <p className="text-xs text-muted-foreground">Removes &quot;Powered by&quot; badge</p>
                      </div>
                      <Switch checked={hideFooter} onCheckedChange={setHideFooter} />
                    </div>
                    <div className="py-2 border-t border-border/40">
                      <p className="font-medium">Custom domain</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure a custom hostname per event when editing an event (Pro/Enterprise).{" "}
                        <Link to="/organizer" className="text-primary font-medium underline">
                          Open your events
                        </Link>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">Live experience preview</p>
                <Card className="rounded-[2rem] border-border/60 overflow-hidden bg-gradient-to-b from-muted/50 to-background">
                  <CardContent className="p-4">
                    <div className="mx-auto w-[280px] rounded-[2rem] border-8 border-foreground/10 bg-background shadow-xl overflow-hidden">
                      {logoHttps && !logoPreviewError ? (
                        <div className="flex justify-center py-3 px-4 bg-muted/40 border-b border-border/50">
                          <img
                            src={logoUrl.trim()}
                            alt="Brand logo preview"
                            className="max-h-10 max-w-[200px] object-contain"
                            onError={() => setLogoPreviewError(true)}
                          />
                        </div>
                      ) : null}
                      {!previewEvent ? (
                        <div className="p-6 space-y-3 text-center">
                          <p className="text-sm font-medium text-foreground">No events to preview yet</p>
                          <p className="text-xs text-muted-foreground">
                            Create and publish an event to see how branding colors and footer settings look on a real ticket page.
                          </p>
                          <Button asChild className="w-full rounded-xl" variant="secondary">
                            <Link to="/organizer/events/new">Create event</Link>
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="relative h-36 bg-muted">
                            {eventHeroUrl && !previewImageError ? (
                              <img
                                src={eventHeroUrl}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={() => setPreviewImageError(true)}
                              />
                            ) : (
                              <div
                                className="w-full h-full opacity-90"
                                style={{
                                  background: `linear-gradient(135deg, ${previewColor}cc 0%, ${previewColor}55 100%)`,
                                }}
                              />
                            )}
                          </div>
                          <div className="p-4 space-y-3">
                            <p className="text-[10px] font-bold" style={{ color: previewColor }}>
                              {dateLine}
                            </p>
                            <p className="font-bold text-lg leading-tight line-clamp-2">{eventTitle}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{formatVenueLine(previewEvent)}</p>
                            {previewEvent.customDomain ? (
                              <p className="text-[10px] text-muted-foreground">
                                Domain: <span className="font-mono">{previewEvent.customDomain}</span>
                              </p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              {previewTickets.length === 0 ? (
                                <div
                                  className="col-span-2 rounded-lg p-2 font-medium text-center text-muted-foreground"
                                  style={{ backgroundColor: `${previewColor}12` }}
                                >
                                  Ticket types will appear here once configured for this event.
                                </div>
                              ) : (
                                previewTickets.map((t) => (
                                  <div
                                    key={t.id}
                                    className="rounded-lg p-2 font-semibold truncate"
                                    style={{ backgroundColor: `${previewColor}18` }}
                                    title={`${t.name} · $${Number(t.price).toFixed(2)}`}
                                  >
                                    {t.name} · ${Number(t.price).toFixed(0)}
                                  </div>
                                ))
                              )}
                            </div>
                            <Button asChild className="w-full rounded-xl text-primary-foreground" style={{ backgroundColor: previewColor }}>
                              <Link to={`/events/${previewEvent.id}`}>Get tickets</Link>
                            </Button>
                            {!hideFooter && (
                              <p className="text-[9px] text-center text-muted-foreground">Powered by KanamEvents</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/10 border border-primary/20 p-3 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  Preview uses your real event data (name, date, venue, ticket types). Publish saves branding to your profile for
                  public pages.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </PageShell>
  );
};

export default OrganizerBranding;
