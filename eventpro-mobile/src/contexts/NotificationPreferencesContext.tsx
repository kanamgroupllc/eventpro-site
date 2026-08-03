import React, { createContext, useContext, useState, useCallback } from "react";

export interface NotificationPreferences {
  emailOrderConfirmations: boolean;
  emailMarketing: boolean;
  emailEventReminders: boolean;
  inAppNotifications: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  emailOrderConfirmations: true,
  emailMarketing: false,
  emailEventReminders: true,
  inAppNotifications: true,
};

type ContextValue = {
  notificationPreferences: NotificationPreferences;
  setNotificationPreferences: (partial: Partial<NotificationPreferences>) => void;
};

const Context = createContext<ContextValue | null>(null);

export function NotificationPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

  const setNotificationPreferences = useCallback((partial: Partial<NotificationPreferences>) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <Context.Provider value={{ notificationPreferences: prefs, setNotificationPreferences }}>
      {children}
    </Context.Provider>
  );
}

export function useNotificationPreferences(): ContextValue {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useNotificationPreferences must be used within NotificationPreferencesProvider");
  return ctx;
}
