import { useEffect, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";

interface ReservationCountdownProps {
  /** ISO-8601 timestamp when the reservation expires (tickets released back to pool). */
  reservedUntil: string;
  /** Server timestamp captured with the reservation response, used to correct client clock skew. */
  serverTime?: string;
  /** Called when the countdown reaches zero (reservation expired). */
  onExpired: () => void;
  className?: string;
}

function formatRemaining(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0:00";
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ReservationCountdown({ reservedUntil, serverTime, onExpired, className = "" }: ReservationCountdownProps) {
  const clockOffsetMs = useMemo(
    () => serverTime ? new Date(serverTime).getTime() - Date.now() : 0,
    [serverTime]
  );
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const end = new Date(reservedUntil).getTime();
    const now = Date.now() + clockOffsetMs;
    return Math.max(0, Math.ceil((end - now) / 1000));
  });
  const [expired, setExpired] = useState(false);
  const onExpiredCalled = useRef(false);

  useEffect(() => {
    onExpiredCalled.current = false;
    const endMs = new Date(reservedUntil).getTime();
    const tick = () => {
      const now = Date.now() + clockOffsetMs;
      const left = Math.max(0, Math.ceil((endMs - now) / 1000));
      setSecondsLeft(left);
      if (left <= 0 && !onExpiredCalled.current) {
        onExpiredCalled.current = true;
        setExpired(true);
        onExpired();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [reservedUntil, serverTime, onExpired, clockOffsetMs]);

  if (expired || secondsLeft <= 0) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive ${className}`}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>Reservation expired. Tickets have been released. Please go back and try again.</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm reservation-timer-glow ${className}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
        <Clock className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="font-medium text-foreground">
          Tickets reserved for <span className="tabular-nums font-bold text-primary">{formatRemaining(secondsLeft)}</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Complete payment before they’re released back to the pool.
        </p>
      </div>
      <style>{`
        .reservation-timer-glow {
          animation: reservation-pulse 2s ease-in-out infinite;
        }
        @keyframes reservation-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.2); }
          50% { box-shadow: 0 0 28px rgba(147, 51, 234, 0.35); }
        }
      `}</style>
    </div>
  );
}
