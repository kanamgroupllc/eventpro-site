import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiService } from "@/lib/api";
import { getEventImageUrl } from "@/lib/utils";
import type { Order, Event } from "@/types/api";
import {
  Ticket,
  Calendar,
  DollarSign,
  Download,
  CalendarPlus,
  QrCode,
  Check,
  MapPin,
  Wallet,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { PageShell } from "@/components/PageShell";
import {
  getEventIdFromOrderLineItem,
  getOrderLineItems,
  expandOrderLineItems,
  getTicketQuantityFromOrderItems,
  getQrCodeFromOrderLineItem,
  parseOrderTimestamp,
  resolveOrderEventDate,
  resolveOrderEventEndDate,
  isUpcomingOrder,
  parseApiDateTime,
} from "@/lib/orderLineItem";

type OrderWithMeta = Order & {
  _dateLabel?: string;
  _event?: Event;
  _eventDate?: Date;
  _eventEndDate?: Date;
  _orderDate?: Date;
};

type TicketEntry = {
  key: string;
  order: OrderWithMeta;
  lineItem: unknown;
  ticketIndex: number;
  ticketTotal: number;
};

function normalizeOrder(raw: Record<string, unknown>): Order {
  const totalAmount =
    typeof raw.totalAmount === "number"
      ? raw.totalAmount
      : typeof raw.amount === "number"
        ? raw.amount / 100
        : 0;
  const tickets = getOrderLineItems(raw as { orderItems?: unknown[]; tickets?: unknown[] });
  const rawWhen = raw.createdAt ?? raw.orderDate;
  const createdAt =
    typeof rawWhen === "string" ? rawWhen : parseOrderTimestamp(rawWhen) || "";
  let dateLabel = "—";
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) dateLabel = format(d, "PPP");
  }
  const rawStatus = String(raw.status ?? "").toUpperCase();
  const status: Order["status"] =
    rawStatus === "PAID" || rawStatus === "SUCCESS" || rawStatus === "FULFILLED"
      ? "COMPLETED"
      : rawStatus === "PENDING"
        ? "PENDING"
        : rawStatus === "CANCELLED"
          ? "CANCELLED"
          : rawStatus === "REFUNDED"
            ? "REFUNDED"
            : rawStatus === "COMPLETED"
              ? "COMPLETED"
              : "COMPLETED";
  return {
    id: String(raw.id ?? ""),
    userId: String(raw.userId ?? ""),
    totalAmount,
    status,
    createdAt: createdAt ?? "",
    tickets,
    _dateLabel: dateLabel,
  } as Order & { _dateLabel?: string };
}

function getStatusLabel(status: Order["status"]) {
  switch (status) {
    case "COMPLETED":
      return "Confirmed";
    case "PENDING":
      return "Pending";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

function getStatusBadgeClass(status: Order["status"]) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-400 dark:bg-emerald-400 text-white border border-emerald-300/50 shadow-[0_0_14px_hsl(142_70%_45%_/_0.7),0_0_24px_hsl(142_70%_45%_/_0.3)]";
    case "PENDING":
      return "bg-amber-400/90 text-white border border-amber-300/50";
    case "CANCELLED":
      return "bg-destructive/90 text-destructive-foreground";
    case "REFUNDED":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

const OrderHistory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<OrderWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [viewTicketOrderId, setViewTicketOrderId] = useState<string | null>(null);
  const [ticketTab, setTicketTab] = useState<"upcoming" | "past">("upcoming");

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const [data, wallet] = await Promise.all([
        apiService.getOrders(),
        apiService.getWallet().catch(() => ({ balance: 0, currency: "USD" })),
      ]);
      setWalletBalance(wallet.balance);
      const normalized = (Array.isArray(data) ? data : []).map((o) =>
        normalizeOrder(o as Record<string, unknown>)
      ) as OrderWithMeta[];

      const eventIds = new Set<string>();
      normalized.forEach((o) => {
        getOrderLineItems(o).forEach((t) => {
          const eid = getEventIdFromOrderLineItem(t);
          if (eid) eventIds.add(eid);
        });
      });
      const eventsMap: Record<string, Event> = {};
      await Promise.all(
        Array.from(eventIds).map(async (id) => {
          try {
            const ev = await apiService.getEvent(id);
            eventsMap[id] = ev;
          } catch {
            // ignore
          }
        })
      );

      normalized.forEach((o) => {
        const lineItems = getOrderLineItems(o);
        const firstEventId = getEventIdFromOrderLineItem(lineItems[0]);
        const event = firstEventId ? eventsMap[firstEventId] : undefined;
        o._event = event;
        o._eventDate = resolveOrderEventDate(o, event);
        o._eventEndDate = resolveOrderEventEndDate(o, event);
        o._orderDate = parseApiDateTime(o.createdAt);
      });

      setOrders(normalized);
    } catch (error) {
      console.error("Failed to load orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders, location.key]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const up: TicketEntry[] = [];
    const pa: TicketEntry[] = [];
    orders.forEach((o) => {
      const expanded = expandOrderLineItems(getOrderLineItems(o));
      expanded.forEach((lineItem, idx) => {
        const entry: TicketEntry = {
          key: `${o.id}-${idx}`,
          order: o,
          lineItem,
          ticketIndex: idx + 1,
          ticketTotal: expanded.length,
        };
        if (isUpcomingOrder(o._eventDate, o._eventEndDate, o.status, now)) up.push(entry);
        else pa.push(entry);
      });
    });
    up.sort((a, b) =>
      a.order._eventDate && b.order._eventDate
        ? a.order._eventDate.getTime() - b.order._eventDate.getTime()
        : 0
    );
    pa.sort((a, b) =>
      a.order._eventDate && b.order._eventDate
        ? b.order._eventDate.getTime() - a.order._eventDate.getTime()
        : 0
    );
    return { upcoming: up, past: pa };
  }, [orders]);

  const visibleTickets = ticketTab === "upcoming" ? upcoming : past;

  const viewTicketEntry = viewTicketOrderId
    ? [...upcoming, ...past].find((t) => t.order.id === viewTicketOrderId)
    : null;

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[50vh] items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary/80 uppercase mb-1">Your collection</p>
            <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
              My Tickets
            </h1>
          </div>
          <div
            className="inline-flex rounded-full p-1 bg-primary/10 border border-primary/15 self-start"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={ticketTab === "upcoming"}
              onClick={() => setTicketTab("upcoming")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                ticketTab === "upcoming"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ticketTab === "past"}
              onClick={() => setTicketTab("past")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                ticketTab === "past"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Past Events
            </button>
          </div>
        </div>

        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-accent/8 pointer-events-none" />
            <Card className="relative p-12 text-center border-0 bg-white/70 dark:bg-white/10 backdrop-blur-md">
              <div className="mx-auto mb-6 w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center ring-4 ring-primary/10">
                <Ticket className="h-14 w-14 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Your order history will appear here after your first purchase. Discover events and grab your tickets.
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary via-primary-glow/90 to-accent text-primary-foreground shadow-lg hover:shadow-glow hover:scale-105 transition-all"
                onClick={() => navigate("/events")}
              >
                <Ticket className="mr-2 h-5 w-5" />
                Find Your Next Experience
              </Button>
            </Card>
          </motion.div>
        ) : (
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <div className="relative space-y-8 py-2">
              {visibleTickets.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  No {ticketTab === "upcoming" ? "upcoming" : "past"} tickets in this view.
                  {ticketTab === "upcoming" && past.length > 0 ? (
                    <> Try <button type="button" className="text-primary font-semibold underline" onClick={() => setTicketTab("past")}>Past Events</button>.</>
                  ) : null}
                </p>
              ) : (
                <div className="space-y-5">
                  {visibleTickets.map((entry, index) => (
                    <OrderTicketCard
                      key={entry.key}
                      entry={entry}
                      index={index}
                      onViewTicket={() => setViewTicketOrderId(entry.order.id)}
                      isFeatured={ticketTab === "upcoming"}
                    />
                  ))}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-[1fr_minmax(200px,280px)] pt-4">
                <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent p-6 relative overflow-hidden">
                  <Sparkles className="absolute right-4 top-4 h-8 w-8 text-primary/40" aria-hidden />
                  <h3 className="text-lg font-bold text-foreground mb-2">Upgrade your experience</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    Unlock lounge access and fast-track entry when your organizer enables VIP add-ons for these events.
                  </p>
                  <Button
                    variant="secondary"
                    className="bg-background text-foreground hover:bg-background/90"
                    onClick={() => navigate("/events")}
                  >
                    Add VIP Pass
                  </Button>
                </div>
                <div className="rounded-2xl border border-primary/15 bg-primary/8 p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Wallet className="h-5 w-5" />
                    <span className="font-bold">Electric Wallet</span>
                  </div>
                  <p className="text-2xl font-extrabold text-foreground tracking-tight">
                    ${walletBalance.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {walletBalance > 0 ? "Use at checkout on your next purchase" : "Credits appear when orders are refunded"}
                  </p>
                  <button
                    type="button"
                    className="text-sm font-semibold text-primary mt-2 text-left hover:underline"
                    onClick={() => navigate("/settings#electric-wallet")}
                  >
                    Manage Credits →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!viewTicketEntry} onOpenChange={(open) => !open && setViewTicketOrderId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>View Ticket</DialogTitle>
          </DialogHeader>
          {viewTicketEntry && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-6 flex items-center justify-center min-h-[200px]">
                {getQrCodeFromOrderLineItem(viewTicketEntry.lineItem) ? (
                  <img
                    src={getQrCodeFromOrderLineItem(viewTicketEntry.lineItem)!}
                    alt="Ticket QR code"
                    className="h-44 w-44 rounded-lg object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <QrCode className="h-24 w-24 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">QR code will appear after purchase</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Ticket {viewTicketEntry.ticketIndex} of {viewTicketEntry.ticketTotal}
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                Order #{viewTicketEntry.order.id.slice(0, 8)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

function OrderTicketCard({
  entry,
  index,
  onViewTicket,
  isFeatured = false,
}: {
  entry: TicketEntry;
  index: number;
  onViewTicket: () => void;
  isFeatured?: boolean;
}) {
  const navigate = useNavigate();
  const order = entry.order;
  const event = order._event;
  const eventDate = order._eventDate;
  const eventImageUrl = event?.imageUrl ? getEventImageUrl(event.imageUrl) : undefined;
  const orderDateLabel = order._dateLabel ?? "—";
  const eventDateLabel = eventDate ? format(eventDate, "EEEE, MMMM do, yyyy") : null;
  const dateTimeLine = eventDate ? format(eventDate, "EEE, MMM d • h:mm a").toUpperCase() : null;
  const addr = [event?.addressStreet, event?.addressCity].filter(Boolean).join(", ");
  const venueLine = event?.venue ?? (addr || "Venue TBA");
  const genre = event?.categoryName ?? event?.category ?? "LIVE / EVENT";
  const ticketCount = getTicketQuantityFromOrderItems(getOrderLineItems(order));
  const perTicketAmount = ticketCount > 0 ? Number(order.totalAmount ?? 0) / ticketCount : 0;
  const qrUrl = getQrCodeFromOrderLineItem(entry.lineItem);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group"
    >
      <Card
        className={`relative overflow-hidden rounded-2xl border border-primary/10 shadow-lg transition-all duration-300 cursor-pointer
          bg-white/80 dark:bg-white/5 backdrop-blur-[10px]
          hover:shadow-[0_0_30px_hsl(var(--primary)_/_0.18)]
          ${isFeatured ? "ring-1 ring-primary/25" : ""}`}
        onClick={() => event?.id && navigate(`/events/${event.id}`)}
      >
        <CardContent className="p-0 flex flex-col md:flex-row">
          <div
            className={`relative flex-shrink-0 overflow-hidden md:rounded-l-2xl ${isFeatured ? "w-full md:w-[42%] min-h-[200px] md:min-h-[220px]" : "w-full md:w-[38%] min-h-[180px]"}`}
          >
            {eventImageUrl ? (
              <img src={eventImageUrl} alt={event?.name ?? "Event"} className="w-full h-full object-cover min-h-[200px]" />
            ) : (
              <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-primary/30 to-primary-glow/25 flex items-center justify-center">
                <Ticket className="h-12 w-12 text-primary/60" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="inline-block rounded-md bg-black/45 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white/95 border border-white/20">
                {genre.toUpperCase()}
              </span>
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="font-bold text-lg text-white drop-shadow-md line-clamp-2">{event?.name ?? "Event"}</h3>
            </div>
          </div>

          <div className="flex-1 p-5 flex flex-col justify-between gap-4 relative">
            <Ticket className="absolute right-4 top-4 h-5 w-5 text-primary/70 hidden sm:block" aria-hidden />

            <div className="space-y-3 min-w-0 pr-8">
              {dateTimeLine && (
                <p className="text-sm font-bold text-primary tracking-wide">{dateTimeLine}</p>
              )}
              <p className="text-sm text-foreground flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{venueLine}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/15">
                  Ticket {entry.ticketIndex} of {entry.ticketTotal}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">Order #{order.id.slice(0, 8)}</span>
                <Badge className={`inline-flex items-center gap-1.5 ${getStatusBadgeClass(order.status)}`}>
                  {order.status === "COMPLETED" && <Check className="h-3.5 w-3.5 shrink-0" />}
                  {getStatusLabel(order.status)}
                </Badge>
                <span>·</span>
                <span>Ordered {orderDateLabel}</span>
              </div>
              {eventDateLabel && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {eventDateLabel}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border/60">
              <div className="flex items-center gap-3 flex-1">
                <div className="rounded-lg border bg-muted/40 p-2">
                  {qrUrl ? (
                    <img src={qrUrl} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <QrCode className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ticket value</p>
                  <p className="text-lg font-bold flex items-center gap-0.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {perTicketAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.ticketTotal} ticket{entry.ticketTotal !== 1 ? "s" : ""} in order
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground border-0 shadow-md min-w-[140px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewTicket();
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary/10"
                  onClick={(e) => e.stopPropagation()}
                  title="Download PDF"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary/10"
                  onClick={(e) => e.stopPropagation()}
                  title="Add to Calendar"
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default OrderHistory;
