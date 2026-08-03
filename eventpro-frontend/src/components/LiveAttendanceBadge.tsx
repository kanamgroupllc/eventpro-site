import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/** Simulated "vibe" count: stable base per event id, fluctuates slightly every ~60s. */
export function useSimulatedViewers(eventId: string, min = 5, max = 28): number {
  const base = useMemo(() => min + Math.floor((max - min + 1) * (hashCode(eventId) % 1000) / 1000), [eventId, min, max]);
  const [count, setCount] = useState(base);

  useEffect(() => {
    const t = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setCount((c) => Math.max(min, Math.min(max, c + delta)));
    }, 60000);
    return () => clearInterval(t);
  }, [base, min, max]);

  return count;
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

export type LiveBadgeVariant =
  | "viewing"      // "12 people viewing now"
  | "sold"         // "350 tickets sold"
  | "urgency"      // "Selling fast! Only 10 left"
  | "community"    // "Joined by 200+ community members"
  | "friends";     // "John and 4 others are going"

export interface LiveAttendanceBadgeProps {
  /** Which message template to show. */
  variant: LiveBadgeVariant;
  /** Main number for the stat (viewers, sold, left, etc.). */
  count: number;
  /** For "friends": primary name e.g. "John"; total others = count. */
  friendName?: string;
  /** Optional: override full label (ignores variant/count). */
  label?: string;
  /** Placement context for spacing. */
  placement?: "card" | "details";
  className?: string;
}

/** Flips digit upward when value increases (vibrant transition). */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex flex-col overflow-hidden tabular-nums", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function getLabel(props: LiveAttendanceBadgeProps): string {
  if (props.label) return props.label;
  const { variant, count, friendName } = props;
  switch (variant) {
    case "viewing":
      return `${count} people viewing now`;
    case "sold":
      return `${count} tickets sold`;
    case "urgency":
      return `Selling fast! Only ${count} left`;
    case "community":
      return `Joined by ${count}+ community members`;
    case "friends":
      return friendName ? `${friendName} and ${count} others are going` : `${count} people going`;
    default:
      return `${count} viewing`;
  }
}

/**
 * Live Attendance Badge — pulse aesthetic, glassmorphism, dynamic copy.
 * Use on event cards (top-right over image) and event details (next to CTA).
 */
export function LiveAttendanceBadge({
  variant,
  count,
  friendName,
  label,
  placement = "card",
  className,
}: LiveAttendanceBadgeProps) {
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    setDisplayCount(count);
  }, [count]);

  const fullText = getLabel({ variant, count, friendName, label });

  return (
    <>
      <style>{`
        .live-badge-pulse {
          animation: live-pulse-dot 2s ease-in-out infinite;
        }
        @keyframes live-pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4); }
          50% { transform: scale(1.15); opacity: 0.95; box-shadow: 0 0 8px 2px rgba(34, 211, 238, 0.5); }
        }
      `}</style>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-2.5 py-1",
          "text-[11px] sm:text-xs font-medium text-foreground/95",
          "shadow-[0_0_12px_rgba(34,211,238,0.15)]",
          placement === "card" && "border-accent-cyan/30",
          className
        )}
        role="status"
        aria-live="polite"
        aria-label={fullText}
      >
        <span
          className="live-badge-pulse h-1.5 w-1.5 shrink-0 rounded-full bg-[hsl(var(--accent-cyan))]"
          aria-hidden
        />
        {label ? (
          <span className="truncate max-w-[180px] sm:max-w-[240px]">{label}</span>
        ) : (
          <span className="truncate max-w-[180px] sm:max-w-[240px]">
            {variant === "viewing" && <><AnimatedNumber value={displayCount} /> people viewing now</>}
            {variant === "sold" && <><AnimatedNumber value={displayCount} /> tickets sold</>}
            {variant === "urgency" && <>Selling fast! Only <AnimatedNumber value={displayCount} /> left</>}
            {variant === "community" && <>Joined by <AnimatedNumber value={displayCount} />+ community members</>}
            {variant === "friends" && (
              friendName ? <>{friendName} and <AnimatedNumber value={displayCount} /> others are going</>
              : <><AnimatedNumber value={displayCount} /> people going</>
            )}
          </span>
        )}
      </div>
    </>
  );
}