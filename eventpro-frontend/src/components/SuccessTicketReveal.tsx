import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Ticket,
  X,
  Calendar,
  Armchair,
  Compass,
  Share2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { getEventImageUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

const QR_BASE = "https://api.qrserver.com/v1/create-qr-code/";

export interface SuccessTicketRevealProps {
  orderId: string | null;
  eventName: string;
  attendeeName: string;
  ticketType: string;
  /** Individual tickets purchased (expanded by quantity). */
  tickets?: { label: string; index: number; total: number }[];
  /** Paid total for display */
  totalAmount?: number;
  eventImageUrl?: string;
  eventDateLine?: string;
  venueLine?: string;
}

function shareUrl(): string {
  return typeof window !== "undefined" ? `${window.location.origin}/events` : "";
}

export function SuccessTicketReveal({
  orderId,
  eventName,
  attendeeName,
  ticketType,
  tickets = [],
  totalAmount = 0,
  eventImageUrl,
  eventDateLine,
  venueLine,
}: SuccessTicketRevealProps) {
  const navigate = useNavigate();
  const text = eventName ? `I'm going to ${eventName}!` : "Just got tickets!";
  const url = shareUrl();
  const heroSrc = eventImageUrl ? getEventImageUrl(eventImageUrl) : undefined;
  const ticketCards =
    tickets.length > 0
      ? tickets
      : [{ label: ticketType || "General admission", index: 1, total: 1 }];

  const openShare = (kind: string) => {
    const encoded = encodeURIComponent(`${text} ${url}`);
    const maps: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?text=${encoded}`,
      whatsapp: `https://wa.me/?text=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    };
    if (kind === "tiktok" || kind === "snapchat") {
      toast.message("Open the app to share", { description: `Copy your link and paste in ${kind}.` });
      void navigator.clipboard.writeText(url);
      return;
    }
    const href = maps[kind];
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-[#f9f8ff] dark:bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-b border-border/60">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/events")} aria-label="Close">
          <X className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold font-headline text-foreground">Order Confirmed</h1>
        <span className="text-lg font-extrabold font-headline text-primary w-10 text-right">VIBE</span>
      </header>

      <div className="max-w-md mx-auto px-4 pb-16 pt-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-[0_12px_40px_rgba(10,102,240,0.45)]">
            <Ticket className="h-10 w-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-extrabold font-headline text-foreground tracking-tight">You&apos;re Going!</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed px-2">
            Your seats are secured. Get ready for an unforgettable night at the festival.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 space-y-4"
        >
          {ticketCards.map((ticket, idx) => {
            const seatLabel =
              ticket.total > 1 ? `${ticket.label} (${ticket.index}/${ticket.total})` : ticket.label;
            const qrData = orderId ? `${orderId}:${idx + 1}` : null;
            return (
              <div
                key={`${seatLabel}-${idx}`}
                className="rounded-3xl border border-border/60 bg-card shadow-[0_20px_50px_rgba(10,10,10,0.08)] overflow-hidden"
              >
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  {heroSrc ? (
                    <img src={heroSrc} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-slate-900 via-primary/40 to-pink-500/30" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-md bg-pink-600/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Ticket {idx + 1} of {ticketCards.length}
                  </span>
                  <p className="absolute bottom-3 left-3 right-3 text-xl font-bold text-white drop-shadow-md line-clamp-2">
                    {eventName || "Event"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 border-b border-border/50">
                  <div>
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date &amp; time</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{eventDateLine ?? "See event page"}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                      <Armchair className="h-4 w-4 shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ticket</span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{seatLabel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{venueLine ?? "Venue TBA"}</p>
                  </div>
                </div>

                <div className="px-4 py-4 border-b border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">Instant access QR</p>
                  <div className="flex justify-center rounded-2xl bg-primary/8 p-4">
                    {qrData ? (
                      <img
                        src={`${QR_BASE}?size=180x180&data=${encodeURIComponent(qrData)}&format=svg`}
                        alt={`Ticket ${idx + 1} QR code`}
                        className="h-44 w-44 rounded-xl"
                      />
                    ) : (
                      <div className="h-44 w-44 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm">QR</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded-3xl border border-border/60 bg-card p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Total amount paid</p>
            <p className="text-3xl font-bold font-headline text-foreground tabular-nums mt-1">
              ${totalAmount > 0 ? totalAmount.toFixed(2) : "—"}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary">
              <Check className="h-4 w-4" />
              TRANSACTION SECURE
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-6 space-y-3">
          <Button
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary via-primary to-primary-glow text-primary-foreground font-bold shadow-md"
            onClick={() => navigate("/orders")}
          >
            <Ticket className="h-4 w-4 mr-2" />
            View my tickets
          </Button>
          <Button
            variant="secondary"
            className="w-full h-12 rounded-2xl bg-primary/10 text-primary border-0 hover:bg-primary/15 font-semibold"
            onClick={() => navigate("/events")}
          >
            <Compass className="h-4 w-4 mr-2" />
            Explore more events
          </Button>
          <Button
            className="w-full h-12 rounded-2xl border-0 text-white font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 shadow-md"
            onClick={() => toast.success("Use your phone to post to Stories", { description: "Screenshot this page or open tickets in the app." })}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share to Story
          </Button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <SocialBtn label="Facebook" className="bg-[#1877F2] hover:bg-[#1877F2]/90" onClick={() => openShare("facebook")} />
            <SocialBtn label="X" className="bg-black hover:bg-black/90" onClick={() => openShare("x")} />
            <SocialBtn label="WhatsApp" className="bg-[#25D366] hover:bg-[#25D366]/90" onClick={() => openShare("whatsapp")} />
            <SocialBtn label="TikTok" className="bg-black hover:bg-black/90" onClick={() => openShare("tiktok")} />
            <SocialBtn label="Snapchat" className="bg-[#FFFC00] text-black hover:bg-[#FFFC00]/90" onClick={() => openShare("snapchat")} />
            <SocialBtn label="LinkedIn" className="bg-[#0A66C2] hover:bg-[#0A66C2]/90" onClick={() => openShare("linkedin")} />
          </div>
        </motion.div>

        <p className="mt-8 text-center text-xs text-muted-foreground leading-relaxed">
          A confirmation email has been sent to your registered address.
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Need help?{" "}
          <Link to="/contact" className="font-semibold text-primary underline underline-offset-2">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  );
}

function SocialBtn({
  label,
  className,
  onClick,
}: {
  label: string;
  className?: string;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant="secondary" className={cn("h-11 rounded-xl text-white font-semibold", className)} onClick={onClick}>
      {label}
    </Button>
  );
}
