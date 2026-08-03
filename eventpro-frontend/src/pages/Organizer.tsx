import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Plus, Edit, CheckCircle, Clock, BarChart, Ticket, RefreshCw, ShoppingBag, Mail, QrCode, Users, Palette, TrendingUp, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { apiService } from "@/lib/api";
import { Event, EventPulse, OrganizerInsights } from "@/types/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getEventImageUrl } from "@/lib/utils";
import { EmailAttendeesDialog } from "@/components/EmailAttendeesDialog";
import { PageShell } from "@/components/PageShell";
import { OrganizerDashboardStitch } from "@/components/OrganizerDashboardStitch";

/** Merchandise & add-ons are Pro and Enterprise only per pricing page. */
function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

/** Email ticket holders is Pro and Enterprise only. */
function canEmailAttendees(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

const Organizer = () => {
  const { user } = useAuth();
  const showEnhance = canUseAddons(user?.subscriptionTier);
  const showEmailAttendees = canEmailAttendees(user?.subscriptionTier);
  const [draftEvents, setDraftEvents] = useState<Event[]>([]);
  const [publishedEvents, setPublishedEvents] = useState<Event[]>([]);
  const [insights, setInsights] = useState<OrganizerInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publishingEventId, setPublishingEventId] = useState<string | null>(null);
  const [emailAttendeesEvent, setEmailAttendeesEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    apiService.getOrganizerInsights().then(setInsights).catch(() => setInsights(null));
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const allEvents = await apiService.getOrganizerEvents();
      setDraftEvents(allEvents.filter(e => e.status === "DRAFT"));
      setPublishedEvents(allEvents.filter(e => e.status === "PUBLISHED"));
    } catch (error: any) {
      console.error("Failed to load events:", error);
      toast.error("Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (eventId: string) => {
    try {
      setPublishingEventId(eventId);
      await apiService.publishEvent(eventId);
      toast.success("Event published successfully!");
      // Reload events to update lists
      await loadEvents();
    } catch (error: any) {
      console.error("Failed to publish event:", error);
      const message = error.response?.data?.message || "Failed to publish event";
      toast.error(message);
    } finally {
      setPublishingEventId(null);
    }
  };

  const pulseByEventId = new Map<string, EventPulse>(
    (insights?.eventPulses ?? []).map((p) => [p.eventId, p])
  );

  const EventCard = ({ event, isDraft = false }: { event: Event; isDraft?: boolean }) => {
    const [imgError, setImgError] = useState(false);
    const pulse = pulseByEventId.get(event.id);
    const showEmailBtn = showEmailAttendees && !isDraft;
    const displayUrl = getEventImageUrl(event.imageUrl);
    const showImage = event.imageUrl && displayUrl && !imgError;
    const pulseStyle =
      pulse?.velocity === "trending_up"
        ? "bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]"
        : pulse?.velocity === "slowing"
          ? "bg-amber-500/90 text-white shadow-[0_0_10px_rgba(245,158,11,0.4)]"
          : pulse
            ? "bg-blue-500/90 text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]"
            : "";
    return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5">
        {showImage ? (
          <img
            src={displayUrl}
            alt={event.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Calendar className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {isDraft && (
          <Badge className="absolute top-2 right-2" variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        )}
        {!isDraft && pulse && (
          <Badge className={`absolute top-2 left-2 text-xs ${pulseStyle}`} title={pulse.label}>
            {pulse.label}
          </Badge>
        )}
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{event.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {event.description || "No description"}
            </CardDescription>
          </div>
        </div>
        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
          <div>
            {format(new Date(event.startTime), "PPP")}
          </div>
          <div>
            {event.addressCity && event.addressState
              ? `${event.addressCity}, ${event.addressState}`
              : event.addressCity || "Location TBD"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
            <Link to={`/organizer/events/${event.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
            <Link to={`/organizer/events/${event.id}/tickets`}>
              <Ticket className="h-4 w-4 mr-2" />
              Tickets
            </Link>
          </Button>
          {showEnhance && event.reservedSeatingEnabled ? (
            <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
              <Link to={`/organizer/events/${event.id}/seat-map`} title="Seat map editor">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Seats
              </Link>
            </Button>
          ) : null}
          {showEnhance ? (
            <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
              <Link to={`/organizer/events/${event.id}/enhancements`}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Enhance
              </Link>
            </Button>
          ) : (
            <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
              <Link to="/pricing" title="Merchandise & add-ons require Pro or Enterprise">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Enhance (Pro)
              </Link>
            </Button>
          )}
          {showEmailBtn ? (
            <Button
              variant="outline"
              className="flex-1 min-w-[100px]"
              onClick={() => setEmailAttendeesEvent(event)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Email attendees
            </Button>
          ) : (
            !isDraft && (
              <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
                <Link to="/pricing" title="Email ticket holders is available on Pro and Enterprise">
                  <Mail className="h-4 w-4 mr-2" />
                  Email (Pro)
                </Link>
              </Button>
            )
          )}
        </div>
        {isDraft && (
          <Button
            onClick={() => handlePublish(event.id)}
            disabled={publishingEventId === event.id}
            className="w-full bg-gradient-primary"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {publishingEventId === event.id ? "Publishing..." : "Publish"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
  };

  return (
    <>
      {/* Email attendees dialog (Pro/Enterprise) */}
      {emailAttendeesEvent && (
        <EmailAttendeesDialog
          open={!!emailAttendeesEvent}
          onOpenChange={(open) => !open && setEmailAttendeesEvent(null)}
          eventId={emailAttendeesEvent.id}
          eventName={emailAttendeesEvent.name}
        />
      )}
      <PageShell>
      <div className="container mx-auto px-4 py-8">
        <OrganizerDashboardStitch
          firstName={user?.firstName ?? undefined}
          publishedEventCount={publishedEvents.length}
          insights={insights}
        />

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Calendar className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">
                Organizer hub
              </h1>
              <p className="text-muted-foreground text-sm">Events, payouts, and team</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            <Link to="/organizer/financials">
              <Button variant="default" className="bg-gradient-primary">
                <TrendingUp className="h-4 w-4 mr-2" />
                Event insights
              </Button>
            </Link>
            <Link to="/organizer/branding">
              <Button variant="outline">
                <Palette className="h-4 w-4 mr-2" />
                Branding
              </Button>
            </Link>
            <Link to="/organizer/team">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Team
              </Button>
            </Link>
            <Link to="/organizer/check-in">
              <Button variant="outline">
                <QrCode className="h-4 w-4 mr-2" />
                Check-in App
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={loadEvents}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/organizer/events/new">
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <p className="font-semibold text-foreground">Financials &amp; analytics</p>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue, payouts, AI insights, exports, and live sales — all in one place.
            </p>
          </div>
          <Button asChild className="rounded-full bg-gradient-primary shrink-0">
            <Link to="/organizer/financials">Open event insights</Link>
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Draft Events</p>
                  <p className="text-3xl font-bold">{draftEvents.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Published Events</p>
                  <p className="text-3xl font-bold">{publishedEvents.length}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardHeader>
          </Card>

          <Link to="/organizer/financials" className="block">
            <Card className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-shadow h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Analytics</p>
                    <p className="text-lg font-bold text-foreground mt-1">View insights</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BarChart className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </motion.div>

        {/* Draft Events Section */}
        {draftEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-yellow-500" />
              <h2 className="text-2xl font-bold">Draft Events</h2>
              <Badge variant="secondary">{draftEvents.length}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {draftEvents.map((event) => (
                <EventCard key={event.id} event={event} isDraft />
              ))}
            </div>
          </motion.div>
        )}

        {/* Published Events Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <h2 className="text-2xl font-bold">Published Events</h2>
            <Badge variant="secondary">{publishedEvents.length}</Badge>
          </div>
          {publishedEvents.length === 0 && draftEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">No events yet.</p>
                <Link to="/organizer/events/new">
                  <Button className="bg-gradient-primary">Create your first event</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
      </PageShell>
    </>
  );
};

export default Organizer;
