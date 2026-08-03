import { useEffect, useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { usePreferences } from "@/contexts/PreferencesContext";
import { apiService } from "@/lib/api";
import type { Event } from "@/types/api";

interface RecentlyViewedEventsProps {
  maxDisplay?: number;
}

export const RecentlyViewedEvents: React.FC<RecentlyViewedEventsProps> = ({
  maxDisplay = 4,
}) => {
  const { recentlyViewed } = usePreferences();
  const [eventsWithDetails, setEventsWithDetails] = useState<Event[]>([]);

  const displayedFromStorage = useMemo(
    () => recentlyViewed.slice(0, maxDisplay),
    [recentlyViewed, maxDisplay]
  );
  const idsKey = useMemo(
    () => displayedFromStorage.map((e) => e.id).join(","),
    [displayedFromStorage]
  );

  useEffect(() => {
    if (displayedFromStorage.length === 0) {
      setEventsWithDetails([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      displayedFromStorage.map((stored) =>
        apiService.getEvent(stored.id).catch(() => stored)
      )
    ).then((fetched) => {
      if (!cancelled) {
        setEventsWithDetails(
          fetched.map((e) => ({
            ...e,
            startTime: e.startTime ?? e.startDateTime ?? "",
            endTime: e.endTime ?? e.endDateTime ?? "",
          }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (recentlyViewed.length === 0) {
    return null;
  }

  const toShow = eventsWithDetails.length > 0 ? eventsWithDetails : displayedFromStorage;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Recently Viewed</h2>
      <div className="flex gap-6 overflow-x-auto pb-4 -mx-1 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:thin]">
        {toShow.map((event, index) => (
          <div key={event.id} className="flex-shrink-0 w-[min(100%,320px)] sm:w-80 snap-start">
            <EventCard event={event} index={index} />
          </div>
        ))}
      </div>
    </div>
  );
};
