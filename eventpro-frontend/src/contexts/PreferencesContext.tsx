import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Event } from "@/types/api";

export interface NotificationPreferences {
  emailOrderConfirmations: boolean;
  emailMarketing: boolean;
  emailEventReminders: boolean;
  inAppNotifications: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  emailOrderConfirmations: true,
  emailMarketing: false,
  emailEventReminders: true,
  inAppNotifications: true,
};

const STORAGE_KEYS = {
  recentlyViewed: "eventpro_recently_viewed",
  notificationPrefs: "eventpro_notification_preferences",
} as const;

interface PreferencesContextType {
  recentlyViewed: Event[];
  addRecentlyViewed: (event: Event) => void;
  clearRecentlyViewed: () => void;
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (prefs: Partial<NotificationPreferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const MAX_RECENTLY_VIEWED = 10;

function loadNotificationPrefs(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.notificationPrefs);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
      return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load notification preferences", e);
  }
  return { ...DEFAULT_NOTIFICATION_PREFS };
}

function saveNotificationPrefs(prefs: NotificationPreferences) {
  try {
    localStorage.setItem(STORAGE_KEYS.notificationPrefs, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save notification preferences", e);
  }
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recentlyViewed, setRecentlyViewed] = useState<Event[]>([]);
  const [notificationPreferences, setNotificationPreferencesState] = useState<NotificationPreferences>(loadNotificationPrefs);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.recentlyViewed);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as (Event & { startDateTime?: string; endDateTime?: string })[];
        const normalized: Event[] = parsed.map((e) => ({
          ...e,
          startTime: e.startTime ?? e.startDateTime ?? "",
          endTime: e.endTime ?? e.endDateTime ?? "",
        }));
        setRecentlyViewed(normalized);
      } catch (error) {
        console.error("Failed to parse recently viewed:", error);
      }
    }
  }, []);

  const addRecentlyViewed = (event: Event) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((e) => e.id !== event.id);
      const updated = [event, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
      localStorage.setItem(STORAGE_KEYS.recentlyViewed, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentlyViewed = () => {
    setRecentlyViewed([]);
    localStorage.removeItem(STORAGE_KEYS.recentlyViewed);
  };

  const setNotificationPreferences = useCallback((partial: Partial<NotificationPreferences>) => {
    setNotificationPreferencesState((prev) => {
      const next = { ...prev, ...partial };
      saveNotificationPrefs(next);
      return next;
    });
  }, []);

  return (
    <PreferencesContext.Provider
      value={{
        recentlyViewed,
        addRecentlyViewed,
        clearRecentlyViewed,
        notificationPreferences,
        setNotificationPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
};
