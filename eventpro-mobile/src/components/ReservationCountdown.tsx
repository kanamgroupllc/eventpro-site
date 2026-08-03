import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";

type Props = {
  /** ISO-8601 timestamp when the reservation expires. */
  reservedUntil: string;
  serverTime?: string;
  onExpired: () => void;
};

function formatRemaining(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0:00";
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ReservationCountdown({ reservedUntil, serverTime, onExpired }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const clockOffsetMs = useMemo(() => serverTime ? new Date(serverTime).getTime() - Date.now() : 0, [serverTime]);
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const end = new Date(reservedUntil).getTime();
    return Math.max(0, Math.ceil((end - (Date.now() + clockOffsetMs)) / 1000));
  });
  const [expired, setExpired] = useState(false);
  const onExpiredCalled = useRef(false);

  useEffect(() => {
    onExpiredCalled.current = false;
    setExpired(false);
    const endMs = new Date(reservedUntil).getTime();
    const tick = () => {
      const left = Math.max(0, Math.ceil((endMs - (Date.now() + clockOffsetMs)) / 1000));
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
      <View style={[styles.box, styles.expired]}>
        <Ionicons name="time-outline" size={20} color={theme.colors.destructive} />
        <Text style={[styles.expiredText, { color: theme.colors.destructive }]}>
          Reservation expired. Tickets have been released. Please go back and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.box, styles.active, { borderColor: theme.colors.primary + "50", backgroundColor: theme.colors.primary + "12" }]}>
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "25" }]}>
        <Ionicons name="time-outline" size={22} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          Tickets reserved for{" "}
          <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{formatRemaining(secondsLeft)}</Text>
        </Text>
        <Text style={[styles.sub, { color: theme.colors.mutedForeground }]}>
          Complete payment before they're released back to the pool.
        </Text>
      </View>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    box: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      marginBottom: theme.spacing.md,
    },
    active: {},
    expired: {
      borderColor: theme.colors.destructive + "80",
      backgroundColor: theme.colors.destructive + "15",
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    title: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
    sub: { fontSize: 12, marginTop: 2, lineHeight: 18 },
    expiredText: { flex: 1, fontSize: 13, lineHeight: 19 },
  });
}
