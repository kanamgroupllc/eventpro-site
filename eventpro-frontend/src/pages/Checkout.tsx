import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { GuestCheckoutFormBento } from "@/components/GuestCheckoutFormBento";
import { MerchandiseAddons, type MerchandiseItem } from "@/components/MerchandiseAddons";
import { CheckoutPaymentForm } from "@/components/CheckoutPaymentForm";
import { ReservationCountdown } from "@/components/ReservationCountdown";
import { SuccessTicketReveal } from "@/components/SuccessTicketReveal";
import { TicketPreview } from "@/components/TicketPreview";
import { apiService } from "@/lib/api";
import { HOW_DID_YOU_HEAR_OPTIONS } from "@/types/api";
import { Ticket, Trash2, ArrowLeft, User, LogIn, MessageCircle, Smartphone, Lock, ChevronDown, Minus, Plus, Wallet } from "lucide-react";
import { CommunityImpactTile } from "@/components/CommunityImpactTile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { CheckoutSession, Event } from "@/types/api";
import { CheckoutStitchHero } from "@/components/checkout/CheckoutStitchHero";
import { CheckoutPaymentProcessingOverlay } from "@/components/checkout/CheckoutPaymentProcessingOverlay";
import { SeatingMap, type Seat } from "@/components/SeatingMap";
import type { SeatResponse } from "@/types/api";
import { formatTicketTypeName } from "@eventpro/shared";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getUserFacingApiError } from "@/lib/api-errors";

interface SelectedMerchItem extends MerchandiseItem {
  quantity: number;
  selectedSize?: string;
}

function eventAddonsToMerchandise(addons: { id: string; name: string; description?: string; price: number; category: string; imageUrl?: string; sizes?: string[]; isPopular?: boolean }[]): MerchandiseItem[] {
  return addons.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description ?? "",
    price: Number(a.price),
    image: a.imageUrl,
    category: (a.category === "merchandise" || a.category === "addon" || a.category === "upgrade" ? a.category : "addon") as MerchandiseItem["category"],
    popular: a.isPopular ?? false,
    sizes: a.sizes,
  }));
}

/** US states for sales tax jurisdiction dropdown (code + name). */
const US_STATE_OPTIONS: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" }, { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" }, { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" }, { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" }, { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }, { code: "DC", name: "District of Columbia" },
];

const MAX_TICKETS_PER_LINE = 4;

const Checkout = () => {
  const { items, totalAmount, removeItem, clearCart, updateQuantity, refreshCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [checkoutMode, setCheckoutMode] = useState<"select" | "guest" | "login">("select");
  const [selectedMerch, setSelectedMerch] = useState<SelectedMerchItem[]>([]);
  const [addonsByEvent, setAddonsByEvent] = useState<MerchandiseItem[]>([]);
  const [donationAmount, setDonationAmount] = useState(0);
  const [donationsEnabled, setDonationsEnabled] = useState(false);
  const [guestInfo, setGuestInfo] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  } | null>(null);
  const [paymentStep, setPaymentStep] = useState<"review" | "payment" | "success">("review");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<CheckoutSession | null>(null);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState(() =>
    globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  const [reservedUntil, setReservedUntil] = useState<string | null>(null);
  const [reservationServerTime, setReservationServerTime] = useState<string | undefined>();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [howDidYouHear, setHowDidYouHear] = useState<string>("");
  const [receiveTicketViaWhatsApp, setReceiveTicketViaWhatsApp] = useState(false);
  const [receiveTicketViaSMS, setReceiveTicketViaSMS] = useState(false);
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWalletCredits, setUseWalletCredits] = useState(false);
  const [successEventName, setSuccessEventName] = useState<string | null>(null);
  const [successAttendeeName, setSuccessAttendeeName] = useState<string>("");
  const [successTicketType, setSuccessTicketType] = useState<string>("");
  const [successTickets, setSuccessTickets] = useState<{ label: string; index: number; total: number }[]>([]);
  const [successTotal, setSuccessTotal] = useState(0);
  /** Live form values for ticket preview (guest only, before submit). */
  const [previewGuest, setPreviewGuest] = useState({ firstName: "", lastName: "", email: "" });
  /** Checkout totals including tax (from GET /payments/checkout-totals). Use total for payment intent when tax enabled. */
  const [checkoutTotals, setCheckoutTotals] = useState<{ subtotal: number; taxRatePercent: number; tax: number; total: number } | null>(null);
  /** Buyer state/country for jurisdiction-based sales tax (e.g. state=CA, country=US). */
  const [taxState, setTaxState] = useState<string>("");
  const [taxCountry, setTaxCountry] = useState<string>("US");
  const [eventDetail, setEventDetail] = useState<Event | null>(null);
  const [checkoutSeats, setCheckoutSeats] = useState<Seat[]>([]);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cartSeatIds = useMemo(
    () => items.filter((i) => UUID_RE.test(i.ticketTypeId)).map((i) => i.ticketTypeId),
    [items]
  );
  const showVenueMap = checkoutSeats.length > 0 && cartSeatIds.length > 0;

  const eventIds = useMemo(() => [...new Set(items.map((i) => i.eventId).filter(Boolean))], [items]);

  const merchTotal = selectedMerch.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const grandTotal = totalAmount + merchTotal + (donationAmount || 0);
  const displayTotal = checkoutTotals?.total ?? grandTotal;

  // Fetch checkout totals (subtotal + tax) when grandTotal and optional state/country change
  useEffect(() => {
    if (grandTotal <= 0) {
      setCheckoutTotals(null);
      return;
    }
    apiService
      .getCheckoutTotals(grandTotal, taxState || undefined, taxCountry || undefined)
      .then(setCheckoutTotals)
      .catch(() => setCheckoutTotals(null));
  }, [grandTotal, taxState, taxCountry]);

  useEffect(() => {
    if (eventIds.length === 0) {
      setAddonsByEvent([]);
      setDonationsEnabled(false);
      return;
    }
    Promise.all(eventIds.map((eventId) => apiService.getEventAddons(eventId)))
      .then((results) => {
        const merged = results.flat();
        setAddonsByEvent(eventAddonsToMerchandise(merged));
      })
      .catch(() => setAddonsByEvent([]));
    apiService
      .getEvent(eventIds[0])
      .then(async (event) => {
        setEventDetail(event);
        setDonationsEnabled(Boolean(event.donationsEnabled));
        if (event.reservedSeatingEnabled) {
          try {
            const seatsData = await apiService.getEventSeats(eventIds[0]);
            const mapped = (Array.isArray(seatsData) ? seatsData : []).map((s: SeatResponse): Seat => ({
              id: s.id,
              section: s.section,
              row: s.row,
              number: s.seatNumber,
              price: typeof s.price === "number" ? s.price : Number(s.price),
              status: (s.status === "AVAILABLE" ? "available" : s.status === "SOLD" ? "sold" : "reserved") as Seat["status"],
              type: "standard",
            }));
            setCheckoutSeats(mapped);
          } catch {
            setCheckoutSeats([]);
          }
        } else {
          setCheckoutSeats([]);
        }
      })
      .catch(() => {
        setEventDetail(null);
        setDonationsEnabled(false);
        setCheckoutSeats([]);
      });
  }, [eventIds.join(",")]);

  // For signed-in users: cart tickets are already reserved; get expiry for countdown
  useEffect(() => {
    if (!isAuthenticated || items.length === 0) return;
    apiService
      .getCart()
      .then((cart) => {
        if (cart.reservedUntil) setReservedUntil(cart.reservedUntil);
        setReservationServerTime(cart.serverTime);
      })
      .catch(() => {});
  }, [isAuthenticated, items.length]);

  useEffect(() => {
    if (!isAuthenticated) {
      setWalletBalance(0);
      setUseWalletCredits(false);
      return;
    }
    apiService
      .getWallet()
      .then((w) => setWalletBalance(w.balance))
      .catch(() => setWalletBalance(0));
  }, [isAuthenticated]);

  const walletApplyAmount = useMemo(() => {
    if (!isAuthenticated || !useWalletCredits || walletBalance <= 0) return 0;
    return Math.min(walletBalance, displayTotal);
  }, [isAuthenticated, useWalletCredits, walletBalance, displayTotal]);

  const stripeDueAmount = useMemo(
    () => Number(Math.max(0, displayTotal - walletApplyAmount).toFixed(2)),
    [displayTotal, walletApplyAmount]
  );

  const walletCoversAll = walletApplyAmount > 0 && stripeDueAmount <= 0;

  /** Attendee name for ticket preview: from user, guestInfo, or live preview. */
  const attendeeName =
    isAuthenticated && user
      ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
      : guestInfo
        ? `${guestInfo.firstName} ${guestInfo.lastName}`.trim()
        : `${previewGuest.firstName} ${previewGuest.lastName}`.trim();

  /** Ticket type label for preview — one card per physical ticket. */
  const expandedCartTickets = useMemo(
    () =>
      items.flatMap((item) =>
        Array.from({ length: item.quantity }, (_, i) => ({
          label: formatTicketTypeName(item.ticketTypeName),
          index: i + 1,
          total: item.quantity,
        }))
      ),
    [items]
  );

  const ticketLabel =
    expandedCartTickets.length === 0
      ? "Ticket"
      : expandedCartTickets.length === 1
        ? expandedCartTickets[0].label
        : `${expandedCartTickets.length} tickets`;

  const resolvedPhone =
    checkoutPhone.trim() ||
    guestInfo?.phone?.trim() ||
    (isAuthenticated ? user?.phoneNumber?.trim() : "") ||
    "";

  const needsPhoneForDelivery = receiveTicketViaWhatsApp || receiveTicketViaSMS;

  /** Form valid: logged in, or guest info submitted, or live guest form valid (name + email). */
  const isFormValid =
    (isAuthenticated ||
    !!guestInfo ||
    (previewGuest.firstName.trim() !== "" &&
      previewGuest.lastName.trim() !== "" &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previewGuest.email))) &&
    (!needsPhoneForDelivery || resolvedPhone.length >= 7);

  const heroLocation = useMemo(() => {
    if (!eventDetail) return undefined;
    const cityState = [eventDetail.addressCity, eventDetail.addressState].filter(Boolean).join(", ");
    const parts = [eventDetail.venue, cityState].filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }, [eventDetail]);

  const eventDateLine = useMemo(() => {
    const raw = eventDetail?.startTime ?? eventDetail?.startDateTime;
    if (!raw) return undefined;
    try {
      return new Date(raw).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      return undefined;
    }
  }, [eventDetail]);

  const processingOverlayLines = useMemo(() => {
    const lines: { label: string; amount: number }[] = [];
    items.forEach((i) => {
      lines.push({
        label: `${i.quantity}× ${formatTicketTypeName(i.ticketTypeName)}`,
        amount: Number((i.price * i.quantity).toFixed(2)),
      });
    });
    selectedMerch.forEach((m) => {
      lines.push({
        label: `${m.quantity > 1 ? `${m.quantity}× ` : ""}${m.name}${m.selectedSize ? ` (${m.selectedSize})` : ""}`,
        amount: Number((m.price * m.quantity).toFixed(2)),
      });
    });
    if (donationAmount > 0) {
      lines.push({ label: "Donation", amount: Number(donationAmount.toFixed(2)) });
    }
    const taxAmt = checkoutTotals?.tax ?? 0;
    if (taxAmt > 0) {
      lines.push({
        label: checkoutTotals ? `Tax (${checkoutTotals.taxRatePercent}%)` : "Tax",
        amount: Number(taxAmt.toFixed(2)),
      });
    }
    const sumLines = lines.reduce((s, l) => s + l.amount, 0);
    const rest = Number((displayTotal - sumLines).toFixed(2));
    if (rest > 0.015) {
      lines.push({ label: "Service & processing", amount: rest });
    }
    return lines;
  }, [items, selectedMerch, donationAmount, checkoutTotals, displayTotal]);

  const renderOrderSummaryCardContent = () => (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Tickets</h4>
        {items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {formatTicketTypeName(item.ticketTypeName)} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {selectedMerch.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">Add-ons</h4>
          {selectedMerch.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.name}
                {item.selectedSize && ` (${item.selectedSize})`}
                {item.quantity > 1 && ` × ${item.quantity}`}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 pt-2 border-t border-border">
        <div>
          <Label className="text-sm font-medium text-muted-foreground">Billing address</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used for your receipt and to calculate sales tax where required.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={taxCountry || "US"} onValueChange={(v) => setTaxCountry(v || "US")}>
              <SelectTrigger className="rounded-lg border-primary/20 bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State / Province</Label>
            <Select value={taxState || "__"} onValueChange={(v) => setTaxState(v === "__" ? "" : v)}>
              <SelectTrigger className="rounded-lg border-primary/20 bg-background/80">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__">Select state (optional)</SelectItem>
                {US_STATE_OPTIONS.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Tickets Subtotal</span>
          <span>${totalAmount.toFixed(2)}</span>
        </div>
        {merchTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>Add-ons Subtotal</span>
            <span>${merchTotal.toFixed(2)}</span>
          </div>
        )}
        {donationAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Donation</span>
            <span>${donationAmount.toFixed(2)}</span>
          </div>
        )}
        {checkoutTotals && checkoutTotals.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax ({checkoutTotals.taxRatePercent}%)</span>
            <span>${checkoutTotals.tax.toFixed(2)}</span>
          </div>
        )}
        {isAuthenticated && walletBalance > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Electric Wallet</p>
                  <p className="text-xs text-muted-foreground">${walletBalance.toFixed(2)} available</p>
                </div>
              </div>
              <Switch checked={useWalletCredits} onCheckedChange={setUseWalletCredits} />
            </div>
            {useWalletCredits && walletApplyAmount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Applied from wallet</span>
                <span>−${walletApplyAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
        {walletApplyAmount > 0 && stripeDueAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span>Due via card</span>
            <span>${stripeDueAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 border-t">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total</span>
          <span className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
            ${displayTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-sm font-medium text-muted-foreground">How did you hear about this event?</Label>
        <Select value={howDidYouHear || undefined} onValueChange={setHowDidYouHear}>
          <SelectTrigger className="rounded-lg border-primary/20 bg-background/80">
            <SelectValue placeholder="Select (optional)" />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {HOW_DID_YOU_HEAR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3 pt-2 border-t border-border">
        <Label className="text-sm font-medium text-muted-foreground">Receive ticket via</Label>
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-sm">WhatsApp</span>
          </div>
          <Switch checked={receiveTicketViaWhatsApp} onCheckedChange={setReceiveTicketViaWhatsApp} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <span className="text-sm">SMS</span>
          </div>
          <Switch checked={receiveTicketViaSMS} onCheckedChange={setReceiveTicketViaSMS} />
        </div>
        {needsPhoneForDelivery && (
          <div className="space-y-2">
            <Label htmlFor="checkout-phone" className="text-sm text-muted-foreground">
              Mobile number
            </Label>
            <Input
              id="checkout-phone"
              type="tel"
              placeholder="+1 555 123 4567"
              value={checkoutPhone || guestInfo?.phone || ""}
              onChange={(e) => setCheckoutPhone(e.target.value)}
              className="rounded-lg border-primary/20 bg-background/80"
            />
            {!resolvedPhone && (
              <p className="text-xs text-destructive">Enter a phone number to receive your ticket.</p>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">We’ll send your digital ticket to your phone. Great for the diaspora.</p>
      </div>

      {paymentStep === "review" && (
        <>
          {reservedUntil && (
            <ReservationCountdown
              reservedUntil={reservedUntil}
              serverTime={checkoutSession?.serverTime ?? reservationServerTime}
              onExpired={() => {
                setReservedUntil(null);
                void refreshCart();
                toast.warning("Reservation expired. Tickets were released. Please try again.");
              }}
              className="mb-2"
            />
          )}
          <Button
            type="button"
            className={
              isFormValid
                ? "w-full rounded-xl bg-gradient-to-r from-primary via-primary to-orange-500 text-white shadow-[0_4px_20px_rgba(147,51,234,0.4)] hover:shadow-[0_6px_28px_rgba(147,51,234,0.5),0_0_0_1px_rgba(251,146,60,0.3)] hover:scale-[1.02] transition-all duration-200 pay-button-shimmer"
                : "w-full rounded-xl bg-muted text-muted-foreground cursor-not-allowed"
            }
            size="lg"
            disabled={(!isAuthenticated && !guestInfo) || isStartingPayment}
            onClick={(e) => handleProceedToPayment(e)}
          >
            {isStartingPayment ? (
              "Starting payment…"
            ) : isFormValid ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Lock className="h-4 w-4" />
                Secure payment
              </span>
            ) : (
              "Complete your details above"
            )}
          </Button>
          {paymentError && <p className="text-sm text-destructive text-center mt-2">{paymentError}</p>}
        </>
      )}
      {!isAuthenticated && !guestInfo && paymentStep === "review" && (
        <p className="text-xs text-muted-foreground text-center">Please provide your information above to continue</p>
      )}

      <p className="text-xs text-muted-foreground text-center">
        By completing this purchase, you agree to our Terms of Service
      </p>
    </>
  );

  const handleGuestSubmit = (info: typeof guestInfo & { acceptTerms: boolean }) => {
    setGuestInfo(info);
    if (info.phone?.trim()) setCheckoutPhone(info.phone.trim());
    setCheckoutMode("select");
  };

  const handleProceedToPayment = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setPaymentError(null);
    setIsStartingPayment(true);
    if (!isAuthenticated) setReservedUntil(null);
    try {
      const session = await apiService.createCheckoutSession({
        idempotencyKey: checkoutIdempotencyKey,
        items: isAuthenticated ? undefined : items.map((i) => ({
          eventId: i.eventId,
          ticketType: i.ticketTypeId,
          quantity: i.quantity,
        })),
        email: !isAuthenticated ? guestInfo?.email : undefined,
        firstName: !isAuthenticated ? guestInfo?.firstName : undefined,
        lastName: !isAuthenticated ? guestInfo?.lastName : undefined,
        state: taxState?.trim() || undefined,
        country: taxCountry?.trim() || undefined,
        donationAmount: donationAmount > 0 ? Number(donationAmount.toFixed(2)) : undefined,
        walletAmount: isAuthenticated && walletApplyAmount > 0 ? walletApplyAmount : undefined,
        addOns: selectedMerch.map((item) => ({ id: item.id, quantity: item.quantity, size: item.selectedSize })),
      });
      setCheckoutSession(session);
      setReservedUntil(session.expiresAt);
      if (!session.clientSecret) {
        const completed = await apiService.finalizeCheckoutSession(session.id, undefined, session.resumeToken);
        if (!completed.orderId) throw new Error(`Checkout could not be completed (${completed.status})`);
        handlePaymentSuccess(completed.orderId);
      } else {
        setClientSecret(session.clientSecret);
        setPaymentStep("payment");
      }
    } catch (err: unknown) {
      const msg = getUserFacingApiError(err, "Could not start payment. Please try again.");
      setPaymentError(msg);
      toast.error(msg);
    } finally {
      setIsStartingPayment(false);
    }
  };

  const handlePaymentSuccess = (id: string) => {
    setSuccessEventName(items[0]?.eventName ?? null);
    setSuccessAttendeeName(
      isAuthenticated && user
        ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
        : guestInfo
          ? `${guestInfo.firstName} ${guestInfo.lastName}`.trim()
          : `${previewGuest.firstName} ${previewGuest.lastName}`.trim()
    );
    setSuccessTicketType(ticketLabel);
    setSuccessTickets(expandedCartTickets);
    setSuccessTotal(checkoutTotals?.total ?? grandTotal);
    setOrderId(id);
    setPaymentStep("success");
    clearCart();
    toast.success("Order placed successfully");
  };

  const finalizeCurrentSession = async (paymentIntentId: string) => {
    if (!checkoutSession) throw new Error("Checkout session is missing");
    const completed = await apiService.finalizeCheckoutSession(
      checkoutSession.id, paymentIntentId, checkoutSession.resumeToken
    );
    setCheckoutSession(completed);
    if (completed.status !== "COMPLETED" || !completed.orderId) {
      throw new Error(`Checkout could not be completed (${completed.status})`);
    }
    return { id: completed.orderId };
  };

  if (items.length === 0 && paymentStep !== "success") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-background">
        <Card className="p-8 text-center max-w-md rounded-2xl border-border/80 shadow-[0_20px_40px_rgba(10,10,10,0.06)] bg-card/95 backdrop-blur-sm">
          <Ticket className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-extrabold font-headline tracking-tight text-foreground mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
            Browse events and add tickets to your cart to proceed with checkout.
          </p>
          <Button className="rounded-full bg-gradient-primary px-8" onClick={() => navigate("/events")}>
            Browse events
          </Button>
        </Card>
      </div>
    );
  }

  if (paymentStep === "success") {
    return (
      <SuccessTicketReveal
        orderId={orderId}
        eventName={successEventName ?? "Event"}
        attendeeName={successAttendeeName}
        ticketType={successTicketType}
        tickets={successTickets}
        totalAmount={successTotal}
        eventImageUrl={eventDetail?.imageUrl ?? undefined}
        eventDateLine={eventDateLine}
        venueLine={heroLocation}
      />
    );
  }

  return (
    <div className="min-h-screen py-8 relative overflow-hidden">
      {paymentProcessing && paymentStep === "payment" && (
        <CheckoutPaymentProcessingOverlay
          eventName={eventDetail?.name ?? eventDetail?.title ?? items[0]?.eventName ?? "Event"}
          dateLine={eventDateLine}
          imageUrl={eventDetail?.imageUrl}
          lineItems={processingOverlayLines}
          total={displayTotal}
          categoryLabel={eventDetail?.categoryName ?? eventDetail?.category}
        />
      )}
      {/* Subtle background for vibrant one-page feel */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-primary-glow/5 blur-3xl" />
      </div>
      <div className="container relative mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-4xl font-extrabold font-headline tracking-tight bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Checkout
          </h1>
        </div>

        {/* Payment step: single centered glass card */}
        {paymentStep === "payment" && clientSecret ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg mx-auto"
          >
            <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] shadow-[0_0_40px_rgba(147,51,234,0.15)] p-6 sm:p-8 space-y-6">
              {reservedUntil && (
                <ReservationCountdown
                  reservedUntil={reservedUntil}
                  serverTime={checkoutSession?.serverTime ?? reservationServerTime}
                  onExpired={() => {
                    setReservedUntil(null);
                    setPaymentStep("review");
                    void refreshCart();
                    toast.warning("Reservation expired. Tickets were released. Please try again.");
                  }}
                />
              )}
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
                <span className="text-sm text-muted-foreground uppercase tracking-wider">Order total</span>
                <span className="text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-foreground">
                  ${displayTotal.toFixed(2)}
                </span>
              </div>
              <CheckoutPaymentForm
                clientSecret={clientSecret}
                isGuest={!isAuthenticated && !!guestInfo}
                guestConfirm={!isAuthenticated && guestInfo ? finalizeCurrentSession : undefined}
                authenticatedConfirm={
                  isAuthenticated
                    ? finalizeCurrentSession
                    : undefined
                }
                onSuccess={handlePaymentSuccess}
                onError={(msg) => { setPaymentError(msg); toast.error(msg); }}
                billingDetails={(taxState || taxCountry) ? { state: taxState?.trim() || undefined, country: taxCountry?.trim() || undefined } : undefined}
                onProcessingChange={setPaymentProcessing}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={async () => {
                  if (checkoutSession?.status === "PENDING") {
                    try {
                      await apiService.cancelCheckoutSession(checkoutSession.id, checkoutSession.resumeToken);
                    } catch {
                      toast.error("Could not cancel checkout. Please retry.");
                      return;
                    }
                  }
                  setCheckoutSession(null);
                  setClientSecret(null);
                  setCheckoutIdempotencyKey(globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`);
                  setPaymentStep("review");
                  setPaymentError(null);
                  setReservedUntil(isAuthenticated ? checkoutSession?.expiresAt ?? null : null);
                  setPaymentProcessing(false);
                }}
              >
                ← Back to review
              </Button>
              {paymentError && (
                <p className="text-sm text-destructive text-center">{paymentError}</p>
              )}
            </div>
          </motion.div>
        ) : (
        <>
        <CheckoutStitchHero
          eventName={eventDetail?.name ?? eventDetail?.title ?? items[0]?.eventName ?? "Event"}
          location={heroLocation}
          imageUrl={eventDetail?.imageUrl}
        />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mt-8">
          {/* Main Content - one-page vibrant */}
          <div className="xl:col-span-2 space-y-6">
            {showVenueMap && (
              <SeatingMap
                seats={checkoutSeats}
                readOnly
                highlightedSeatIds={cartSeatIds}
                venueName={eventDetail?.venue || "Venue"}
              />
            )}
            {/* Customer Info Section */}
            {!isAuthenticated && !guestInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {checkoutMode === "select" && (
                  <Card className="rounded-xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px]">
                    <CardHeader>
                      <CardTitle>How would you like to check out?</CardTitle>
                      <CardDescription>
                        Choose an option to continue with your purchase
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2"
                        onClick={() => setCheckoutMode("guest")}
                      >
                        <User className="h-6 w-6" />
                        <span>Continue as Guest</span>
                        <span className="text-xs text-muted-foreground">
                          No account required
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2"
                        onClick={() => navigate("/login", { state: { from: { pathname: "/checkout" } } })}
                      >
                        <LogIn className="h-6 w-6" />
                        <span>Sign In</span>
                        <span className="text-xs text-muted-foreground">
                          For faster checkout
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {checkoutMode === "guest" && (
                  <GuestCheckoutFormBento
                    onSubmit={handleGuestSubmit}
                    onLoginClick={() => navigate("/login", { state: { from: { pathname: "/checkout" } } })}
                    onFormChange={setPreviewGuest}
                  />
                )}
              </motion.div>
            )}

            {/* Show logged in user info */}
            {isAuthenticated && user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Show guest info if provided */}
            {!isAuthenticated && guestInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="rounded-xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Guest Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {guestInfo.firstName} {guestInfo.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{guestInfo.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGuestInfo(null);
                          setCheckoutMode("guest");
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Cart Items — Stitch-style quantity steppers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-4">
                <h2 className="text-xl font-semibold font-headline">Select tickets</h2>
                <span className="text-xs font-medium text-primary">{MAX_TICKETS_PER_LINE} tickets max per type</span>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="rounded-2xl border-border/50 bg-card shadow-sm">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold font-headline">{formatTicketTypeName(item.ticketTypeName)}</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">{item.eventName}</p>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 shrink-0">
                            <span className="text-lg font-bold text-primary tabular-nums">${item.price.toFixed(2)}</span>
                            <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/5 p-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{item.quantity}</span>
                              <Button
                                type="button"
                                variant="default"
                                size="icon"
                                className="h-9 w-9 rounded-full"
                                disabled={item.quantity >= MAX_TICKETS_PER_LINE}
                                onClick={() =>
                                  updateQuantity(item.id, Math.min(MAX_TICKETS_PER_LINE, item.quantity + 1))
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive h-8"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Merchandise & Add-ons (dynamic per event) */}
            {addonsByEvent.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <MerchandiseAddons
                  items={addonsByEvent}
                  onItemsChange={setSelectedMerch}
                  eventName={items[0]?.eventName}
                />
              </motion.div>
            )}

            {/* Optional donation (Pro/Enterprise events with donations enabled) */}
            {donationsEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="rounded-xl border-white/10 bg-[rgba(255,255,255,0.05)]">
                  <CardHeader>
                    <CardTitle className="text-lg">Add a donation</CardTitle>
                    <CardDescription>Support the organizer (optional)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {[5, 10, 25, 50].map((n) => (
                        <Button
                          key={n}
                          type="button"
                          variant={donationAmount === n ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDonationAmount(n)}
                        >
                          ${n}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant={donationAmount !== 5 && donationAmount !== 10 && donationAmount !== 25 && donationAmount !== 50 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDonationAmount(0)}
                      >
                        None
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="donation-amount" className="text-sm text-muted-foreground shrink-0">
                        Or enter amount ($):
                      </Label>
                      <Input
                        id="donation-amount"
                        type="number"
                        min={0}
                        step={1}
                        className="max-w-[120px]"
                        value={donationAmount > 0 ? donationAmount : ""}
                        onChange={(e) => setDonationAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                        placeholder="0"
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right column: Ticket Preview + Community Impact + Order Summary */}
          <div className="space-y-6">
            <CommunityImpactTile
              attendeeCount={0}
              eventName={items[0]?.eventName}
              className="w-full"
            />
            {/* Interactive Ticket Preview — one card per physical ticket */}
            <div className="space-y-4">
              {expandedCartTickets.length <= 1 ? (
                <TicketPreview
                  eventName={items[0]?.eventName ?? "Event"}
                  attendeeName={attendeeName}
                  ticketType={ticketLabel}
                  totalAmount={displayTotal}
                  isUnlocked={isFormValid}
                />
              ) : (
                expandedCartTickets.map((ticket, idx) => (
                  <TicketPreview
                    key={`${ticket.label}-${idx}`}
                    eventName={items[0]?.eventName ?? "Event"}
                    attendeeName={attendeeName}
                    ticketType={
                      ticket.total > 1 ? `${ticket.label} (${ticket.index}/${ticket.total})` : ticket.label
                    }
                    totalAmount={displayTotal / expandedCartTickets.length}
                    isUnlocked={isFormValid}
                  />
                ))
              )}
            </div>
            <div className="hidden xl:block">
              <Card className="sticky top-24 rounded-2xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] shadow-[0_20px_40px_rgba(10,10,10,0.06)]">
                <CardHeader>
                  <CardTitle className="font-headline text-xl tracking-tight">Order summary</CardTitle>
                  <CardDescription>Review your order before payment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">{renderOrderSummaryCardContent()}</CardContent>
              </Card>
            </div>
            <Collapsible defaultOpen={false} className="xl:hidden">
              <Card className="rounded-2xl border-white/10 bg-[rgba(255,255,255,0.05)] backdrop-blur-[12px] shadow-[0_20px_40px_rgba(10,10,10,0.06)] overflow-hidden">
                <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-6 text-left hover:bg-muted/5 transition-colors [&[data-state=open]_svg]:rotate-180">
                  <div>
                    <p className="font-headline text-lg font-bold tracking-tight">Order summary</p>
                    <p className="text-xs text-muted-foreground">Tap to expand fees and details</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-lg font-bold text-primary tabular-nums">${displayTotal.toFixed(2)}</span>
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0 pb-6 px-6">{renderOrderSummaryCardContent()}</CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default Checkout;
