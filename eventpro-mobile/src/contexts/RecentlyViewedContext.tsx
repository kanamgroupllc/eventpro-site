import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import type { Event } from "@eventpro/shared";

const STORAGE_KEY = "eventpro_recently_viewed_ids";
const MAX_RECENTLY_VIEWED = 10;

type RecentlyViewedContextValue = {
  recentlyViewed: Event[];
  addRecentlyViewed: (event: Event) => void;
  clearRecentlyViewed: () => void;
};

const Context = createContext<RecentlyViewedContextValue | undefined>(undefined);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Event[]>([]);

  // Persist only event IDs (small payload) to stay under SecureStore 2048-byte limit.
  // Full recently-viewed list is in-memory only per session.
  const addRecentlyViewed = useCallback((event: Event) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((e) => e.id !== event.id);
      const updated = [event, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
      const idsOnly = updated.map((e) => e.id);
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(idsOnly)).catch(() => {});
      return updated;
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
  }, []);

  const value: RecentlyViewedContextValue = {
    recentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRecentlyViewed(): RecentlyViewedContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error("useRecentlyViewed must be used within RecentlyViewedProvider");
  }
  return ctx;
}
