import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiService } from "@/lib/api";
import type { Event } from "@/types/api";
import { toast } from "sonner";
import { ArrowLeft, Users, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";
import { cn } from "@/lib/utils";
import { CheckInGuestList } from "@/components/check-in/CheckInGuestList";
import { CheckInScannerPanel } from "@/components/check-in/CheckInScannerPanel";

export default function CheckIn() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [tabInit, setTabInit] = useState(false);

  const tabParam = searchParams.get("tab");
  const tab: "guests" | "scan" = tabParam === "scan" || tabParam === "guests" ? tabParam : "guests";

  const isOrganizer = hasRole("ORGANIZER") || hasRole("ADMIN");

  const loadEvents = useCallback(async () => {
    try {
      const list = await apiService.getOrganizerEvents();
      setEvents(list);
      if (list.length > 0) {
        setSelectedEventId((prev) => prev || list[0].id);
      }
    } catch {
      toast.error("Could not load your events");
    }
  }, []);

  useEffect(() => {
    if (isOrganizer) void loadEvents();
  }, [isOrganizer, loadEvents]);

  useEffect(() => {
    if (tabInit) return;
    setTabInit(true);
    if (!searchParams.get("tab")) {
      const preferScan = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
      setSearchParams({ tab: preferScan ? "scan" : "guests" }, { replace: true });
    }
  }, [tabInit, searchParams, setSearchParams]);

  const setTab = (next: "guests" | "scan") => {
    setSearchParams({ tab: next });
  };

  if (!user) {
    navigate("/login");
    return null;
  }
  if (!isOrganizer) {
    return (
      <div className="container max-w-md py-8 px-4">
        <p className="text-muted-foreground text-center">You need organizer access to use check-in.</p>
        <Button variant="link" className="mt-4 w-full" onClick={() => navigate("/pricing")}>
          View plans
        </Button>
      </div>
    );
  }

  return (
    <PageShell>
      <div className="min-h-screen bg-background pb-8 md:pb-12">
        <div className="sticky top-0 z-20 border-b border-border/40 bg-background/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => navigate("/organizer")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">KanamEvents</p>
              <h1 className="text-lg font-bold font-headline truncate">Check-in & attendees</h1>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 pb-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            {events.length > 0 ? (
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="w-full sm:max-w-md rounded-full border-primary/15 bg-primary/[0.04]">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.name ?? ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">Create an event to manage guests.</p>
            )}
            <div className="flex rounded-full bg-muted/80 p-1 self-start">
              <button
                type="button"
                onClick={() => setTab("guests")}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors",
                  tab === "guests" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                Guest list
              </button>
              <button
                type="button"
                onClick={() => setTab("scan")}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors",
                  tab === "scan" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                <QrCode className="h-3.5 w-3.5" />
                Scan
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {!selectedEventId && events.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No events yet.</p>
          ) : tab === "guests" ? (
            <CheckInGuestList
              events={events}
              selectedEventId={selectedEventId}
              onOpenScan={() => setTab("scan")}
            />
          ) : (
            <CheckInScannerPanel />
          )}
        </div>
      </div>
    </PageShell>
  );
}
