import { useCallback, useEffect, useMemo, useState } from "react";
import { apiService } from "@/lib/api";
import type { Attendee, CheckInResult, Event } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  MoreVertical,
  Users,
  Gauge,
  Crown,
  Search,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type GuestFilter = "all" | "in" | "out";

function attendeeLabel(a: Attendee): string {
  const n = [a.firstName, a.lastName].filter(Boolean).join(" ").trim();
  if (n) return n;
  return a.email ?? "Guest";
}

function shortId(ticketId: string) {
  return `#EP-${ticketId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

interface CheckInGuestListProps {
  events: Event[];
  selectedEventId: string;
  onOpenScan: () => void;
}

export function CheckInGuestList({
  events,
  selectedEventId,
  onOpenScan,
}: CheckInGuestListProps) {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GuestFilter>("all");
  const [page, setPage] = useState(1);
  const [checkInLoading, setCheckInLoading] = useState<string | null>(null);
  const pageSize = 10;

  const load = useCallback(async () => {
    if (!selectedEventId) {
      setAttendees([]);
      return;
    }
    setLoading(true);
    try {
      const list = await apiService.getEventAttendees(selectedEventId);
      setAttendees(list);
    } catch {
      toast.error("Could not load guest list");
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees.filter((a) => {
      if (filter === "in" && !a.checkedIn) return false;
      if (filter === "out" && a.checkedIn) return false;
      if (!q) return true;
      const name = attendeeLabel(a).toLowerCase();
      const email = (a.email ?? "").toLowerCase();
      const tid = a.ticketId.toLowerCase();
      return name.includes(q) || email.includes(q) || tid.includes(q);
    });
  }, [attendees, search, filter]);

  const total = attendees.length;
  const checkedInCount = attendees.filter((a) => a.checkedIn).length;
  const pct = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;
  const vipWaiting = attendees.filter(
    (a) => !a.checkedIn && (a.ticketType ?? "").toLowerCase().includes("vip")
  ).length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, filter, selectedEventId]);

  const handleManualCheckIn = async (ticketId: string) => {
    setCheckInLoading(ticketId);
    try {
      const result: CheckInResult = await apiService.checkInTicket(ticketId);
      toast.success(
        result.alreadyCheckedIn
          ? `${result.attendeeName} — already checked in`
          : `Checked in: ${result.attendeeName}`
      );
      await load();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Check-in failed";
      toast.error(msg);
    } finally {
      setCheckInLoading(null);
    }
  };

  const exportList = async () => {
    try {
      await apiService.exportOrganizerData("checkin");
      toast.success("Download started");
    } catch {
      toast.error("Export failed");
    }
  };

  const copyId = (id: string) => {
    void navigator.clipboard.writeText(id);
    toast.success("Ticket ID copied");
  };

  if (!selectedEventId) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-12 text-center text-muted-foreground">
        Select an event above to load the guest list.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        <div className="hidden lg:flex w-40 shrink-0 flex-col items-center gap-2">
          <Avatar className="h-28 w-28 rounded-2xl border-2 border-primary/20">
            <AvatarFallback className="rounded-2xl text-lg font-bold bg-primary/10 text-primary">
              STAFF
            </AvatarFallback>
          </Avatar>
          <p className="text-[10px] font-bold tracking-widest text-muted-foreground text-center">CHECK-IN</p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest">Live management</p>
            <h2 className="text-2xl md:text-3xl font-bold font-headline mt-1">
              {selectedEvent?.name ?? selectedEvent?.title ?? "Select an event"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-primary font-medium">KanamEvents</span> · Management hub
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                <Users className="h-4 w-4 text-primary" />
                Live attendance
              </div>
              <p className="text-3xl font-bold font-headline tabular-nums">{checkedInCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Attendees checked in</p>
              <p className="text-xs text-primary font-medium mt-2">
                {pct}% of {total.toLocaleString()} tickets issued
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                <Gauge className="h-4 w-4 text-primary" />
                Entry speed
              </div>
              <p className="text-3xl font-bold font-headline">12<span className="text-lg font-semibold">/min</span></p>
              <p className="text-xs text-emerald-600 font-medium mt-2">+15% vs last hour (estimate)</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
                <Crown className="h-4 w-4 text-primary" />
                VIP waiting
              </div>
              <p className="text-3xl font-bold font-headline tabular-nums">{vipWaiting}</p>
              <p className="text-xs text-muted-foreground mt-1">Priority lane not checked in</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search attendee name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-full bg-primary/[0.06] border-primary/10"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold font-headline">Guest list</h3>
          <p className="text-sm text-muted-foreground">Real-time update from all entry points.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted/80 p-1">
            {(
              [
                ["all", "All guests"],
                ["in", "Checked in"],
                ["out", "Not arrived"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-full transition-colors",
                  filter === k ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="outline" className="rounded-full border-primary/20" onClick={() => void exportList()}>
            <Download className="h-4 w-4 mr-2" />
            Export list
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card shadow-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading guests…
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Attendee</TableHead>
                  <TableHead>Ticket type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Arrival</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                      No guests match.
                    </TableCell>
                  </TableRow>
                ) : (
                  slice.map((a) => {
                    const initials = attendeeLabel(a)
                      .split(/\s+/)
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <TableRow key={a.ticketId}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{attendeeLabel(a)}</p>
                              <p className="text-xs text-muted-foreground font-mono">{shortId(a.ticketId)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{a.ticketType ?? "General admission"}</TableCell>
                        <TableCell>
                          {a.checkedIn ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                              Checked-in
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not arrived</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {a.checkedIn && a.checkedInAt
                            ? format(new Date(a.checkedInAt), "h:mm a")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {a.checkedIn ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copyId(a.ticketId)}>Copy ticket ID</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-full bg-gradient-primary"
                              disabled={checkInLoading === a.ticketId}
                              onClick={() => void handleManualCheckIn(a.ticketId)}
                            >
                              {checkInLoading === a.ticketId ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "Manual check-in"
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-border/50 text-sm text-muted-foreground">
              <span>
                Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, filtered.length)} of {filtered.length} guests
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Button
        type="button"
        className="lg:hidden fixed bottom-24 right-4 z-40 rounded-full shadow-lg h-12 px-5 bg-gradient-primary"
        onClick={onOpenScan}
      >
        <QrCode className="h-5 w-5 mr-2" />
        Scan
      </Button>
    </div>
  );
}
