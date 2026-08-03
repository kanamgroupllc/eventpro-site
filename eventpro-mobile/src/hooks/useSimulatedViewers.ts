/**
 * Simulated "people viewing" count per event (matches web LiveAttendanceBadge vibe).
 * Stable base derived from eventId, fluctuates slightly every ~60s.
 */
import { useEffect, useMemo, useState } from "react";

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function useSimulatedViewers(eventId: string, min = 5, max = 28): number {
  const base = useMemo(
    () => min + Math.floor(((max - min + 1) * (hashCode(eventId) % 1000)) / 1000),
    [eventId, min, max]
  );
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
