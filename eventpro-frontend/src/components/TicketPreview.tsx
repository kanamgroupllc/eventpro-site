import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface TicketPreviewProps {
  /** Event name (e.g. from first cart item). */
  eventName: string;
  /** Attendee name; show placeholder when empty. */
  attendeeName: string;
  /** Ticket type label (e.g. "VIP", "General Admission", "2 tickets"). */
  ticketType: string;
  /** Total amount in dollars. */
  totalAmount: number;
  /** When true: un-blur QR, breathing glow, "unlocked" state. */
  isUnlocked: boolean;
}

const PLACEHOLDER_NAME = "Your Name Here";

/** Gold glow for VIP, primary for others. */
function ticketTypeGlow(ticketType: string): string {
  const upper = ticketType.toUpperCase();
  if (upper.includes("VIP")) return "0 0 16px rgba(234,179,8,0.5), 0 0 24px rgba(234,179,8,0.25)";
  return "0 0 16px rgba(147,51,234,0.4), 0 0 24px rgba(147,51,234,0.2)";
}

export function TicketPreview({
  eventName,
  attendeeName,
  ticketType,
  totalAmount,
  isUnlocked,
}: TicketPreviewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState({ x: 50, y: 50 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setSpotlight({ x, y });
    },
    []
  );

  const displayName = attendeeName.trim() || PLACEHOLDER_NAME;
  const isPlaceholder = !attendeeName.trim();

  return (
    <>
      <style>{`
        .ticket-preview-float {
          animation: ticket-float 4s ease-in-out infinite;
        }
        @keyframes ticket-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .ticket-preview-breathe {
          animation: ticket-border-breathe 2.5s ease-in-out infinite;
        }
        @keyframes ticket-border-breathe {
          0%, 100% { box-shadow: 0 0 20px rgba(147,51,234,0.25); }
          50% { box-shadow: 0 0 32px rgba(147,51,234,0.45); }
        }
        .ticket-stub-perforated {
          mask-image: radial-gradient(circle at 0 50%, transparent 6px, black 7px);
          mask-size: 14px 100%;
          mask-repeat: repeat-x;
          -webkit-mask-image: radial-gradient(circle at 0 50%, transparent 6px, black 7px);
          -webkit-mask-size: 14px 100%;
          -webkit-mask-repeat: repeat-x;
        }
      `}</style>
      <motion.div
        ref={cardRef}
        className="relative overflow-hidden rounded-xl ticket-preview-float"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setSpotlight({ x: 50, y: 50 })}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Mouse-follow spotlight on glass */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle 80px at ${spotlight.x}% ${spotlight.y}%, rgba(255,255,255,0.15) 0%, transparent 70%)`,
          }}
        />

        <div
          className={`relative rounded-xl border-2 bg-[rgba(255,255,255,0.08)] backdrop-blur-[16px] p-5 sm:p-6 transition-all duration-500 ${
            isUnlocked ? "ticket-preview-breathe border-primary/40" : "border-white/15"
          }`}
        >
          {/* Perforated stub edge (right side) */}
          <div className="ticket-stub-perforated absolute right-0 top-0 bottom-0 w-3 bg-[rgba(255,255,255,0.03)]" />

          {/* Event title — bold uppercase */}
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
            Event
          </p>
          <h3 className="font-bold uppercase tracking-wide text-foreground text-lg sm:text-xl mb-4 line-clamp-2">
            {eventName || "Event Name"}
          </h3>

          {/* Attendee name — sleek, updates in real time */}
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Attendee
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayName}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className={`text-xl sm:text-2xl font-medium tracking-tight mb-4 ${
                isPlaceholder ? "text-muted-foreground italic" : "text-foreground"
              }`}
            >
              {displayName}
            </motion.p>
          </AnimatePresence>

          {/* Ticket type — high-contrast with glow */}
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Ticket type
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={ticketType}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.25 }}
              className="text-base sm:text-lg font-bold text-foreground py-1 px-2 rounded-md inline-block"
              style={{
                boxShadow: ticketTypeGlow(ticketType),
                backgroundColor: ticketType.toUpperCase().includes("VIP") ? "rgba(234,179,8,0.15)" : "rgba(147,51,234,0.15)",
                border: `1px solid ${ticketType.toUpperCase().includes("VIP") ? "rgba(234,179,8,0.4)" : "rgba(147,51,234,0.4)"}`,
              }}
            >
              {ticketType || "Ticket"}
            </motion.p>
          </AnimatePresence>

          {/* QR placeholder — blurred until unlocked */}
          <div className="mt-6 flex justify-center">
            <div
              className={`inline-flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-xl bg-white/10 transition-all duration-500 ${
                isUnlocked ? "blur-0" : "blur-md"
              }`}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-muted flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground text-center px-2">
                  {isUnlocked ? "QR" : "•••"}
                </span>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            {isUnlocked ? "Ready to scan" : "Complete form to reveal"}
          </p>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-baseline">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
            <span className="text-xl font-bold tabular-nums">${totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}
