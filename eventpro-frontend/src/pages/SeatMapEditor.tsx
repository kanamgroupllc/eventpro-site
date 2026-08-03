import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import type { SeatResponse } from "@/types/api";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeatMapBuilder } from "@/components/organizer/SeatMapBuilder";

function canUseAddons(tier: string | undefined): boolean {
  const t = (tier ?? "BASIC").toUpperCase();
  return t === "PRO" || t === "ENTERPRISE";
}

/**
 * Full-width Stitch-style seat map workspace for one event.
 * Ideal entry: organizer hub → event with reserved seating, or event edit flow (same component).
 */
export default function SeatMapEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const showProFeatures = canUseAddons(user?.subscriptionTier);

  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState("");
  const [reservedSeatingEnabled, setReservedSeatingEnabled] = useState(false);
  const [eventSeats, setEventSeats] = useState<SeatResponse[]>([]);
  const [seatMapSections, setSeatMapSections] = useState([
    { name: "", rowCount: 1, seatsPerRow: 1, price: 0 },
  ]);
  const [isSeatMapSubmitting, setIsSeatMapSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate("/organizer");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const event = await apiService.getEvent(id);
        if (cancelled) return;
        setEventName(event.name);
        setReservedSeatingEnabled(!!event.reservedSeatingEnabled);
        if (event.reservedSeatingEnabled) {
          const seats = await apiService.getEventSeats(id);
          if (!cancelled) setEventSeats(seats);
        } else {
          setEventSeats([]);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load event");
          navigate("/organizer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  if (!id) return null;

  if (loading) {
    return (
      <PageShell>
        <div className="container mx-auto flex min-h-[40vh] items-center justify-center px-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to={`/organizer/events/${id}/edit`}>
              <ArrowLeft className="h-4 w-4" />
              Back to event
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground truncate max-w-[min(100%,280px)]">{eventName}</span>
        </div>

        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground md:text-3xl mb-2">
          Seat map
        </h1>
        <p className="text-muted-foreground text-sm mb-8 max-w-2xl">
          Seat maps belong to a single event. Turn on reserved seating in event settings if you have not already,
          then define sections here. This page mirrors the editor embedded on the event form.
        </p>

        {!reservedSeatingEnabled ? (
          <Card>
            <CardHeader>
              <CardTitle>Reserved seating is off</CardTitle>
              <CardDescription>
                Enable &quot;Reserved seating&quot; on the event, save, then return here to build the map.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={`/organizer/events/${id}/edit#section-pro`}>Open event settings</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <SeatMapBuilder
            eventId={id}
            showProFeatures={showProFeatures}
            seatMapSections={seatMapSections}
            setSeatMapSections={setSeatMapSections}
            eventSeats={eventSeats}
            setEventSeats={setEventSeats}
            isSeatMapSubmitting={isSeatMapSubmitting}
            setIsSeatMapSubmitting={setIsSeatMapSubmitting}
            variant="page"
          />
        )}
      </div>
    </PageShell>
  );
}
