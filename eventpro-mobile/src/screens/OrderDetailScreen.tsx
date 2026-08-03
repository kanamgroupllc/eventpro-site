import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";
import { Ionicons } from "@expo/vector-icons";
import { sectionLabel, editorialCard } from "../theme/screenStyles";
import { InstagramStoryTemplate } from "../components/InstagramStoryTemplate";
import { getEventIdFromOrderLineItem, getOrderLineItems, getQrCodeFromOrderLineItem, type Event } from "@eventpro/shared";

type OrderDetailScreenParams = {
  orderId: string;
  eventName?: string;
};

export function OrderDetailScreen({ route }: { route: { params: OrderDetailScreenParams } }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { api } = useAuth();
  const { orderId, eventName: paramEventName } = route.params ?? {};
  const [storyOpen, setStoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [eventName, setEventName] = useState(paramEventName ?? "Your event");
  const [eventMeta, setEventMeta] = useState<{ dateLine?: string; venueLine?: string }>({});

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const order = await api.getOrder(orderId);
        if (cancelled) return;
        const lineItems = getOrderLineItems(order);
        const firstQr = lineItems.map(getQrCodeFromOrderLineItem).find(Boolean) ?? null;
        setQrUrl(firstQr);

        const nestedEventId = lineItems.map(getEventIdFromOrderLineItem).find(Boolean);

        if (nestedEventId) {
          try {
            const ev: Event = await api.getEvent(nestedEventId);
            if (!cancelled) {
              setEventName(ev.name ?? paramEventName ?? "Your event");
              const venue = [ev.venue, ev.addressCity, ev.addressState].filter(Boolean).join(", ");
              const dateLine = ev.startTime
                ? new Date(ev.startTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                : undefined;
              setEventMeta({ dateLine, venueLine: venue || undefined });
            }
          } catch {
            // keep param name
          }
        }
      } catch {
        if (!cancelled) setQrUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, orderId, paramEventName]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[sectionLabel(theme), styles.screenTitle]}>Admission</Text>
      <View style={[editorialCard(theme), styles.card]}>
        <View style={[styles.qrArea, { backgroundColor: theme.colors.muted }]}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} />
          ) : qrUrl ? (
            <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" accessibilityLabel="Ticket QR code" />
          ) : (
            <>
              <Ionicons name="qr-code-outline" size={96} color={theme.colors.mutedForeground} />
              <Text style={[styles.qrPlaceholder, { color: theme.colors.mutedForeground }]}>
                QR code not available yet
              </Text>
            </>
          )}
          <Text style={[styles.qrHint, { color: theme.colors.mutedForeground }]}>Show at venue</Text>
        </View>
        <Text style={[styles.eventName, { color: theme.colors.foreground }]} numberOfLines={2}>
          {eventName}
        </Text>
        <Text style={[styles.orderId, { color: theme.colors.mutedForeground }]}>
          Order #{orderId?.slice(0, 8) ?? "—"}
        </Text>
        <TouchableOpacity
          style={[styles.storyBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setStoryOpen(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="share-social-outline" size={20} color={theme.colors.primaryForeground} />
          <Text style={[styles.storyBtnText, { color: theme.colors.primaryForeground }]}>Share story template</Text>
        </TouchableOpacity>
      </View>

      <InstagramStoryTemplate
        visible={storyOpen}
        onClose={() => setStoryOpen(false)}
        eventName={eventName}
        dateLine={eventMeta.dateLine ?? "—"}
        venueLine={eventMeta.venueLine ?? "Venue TBA"}
      />
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, padding: theme.spacing.md, justifyContent: "center", alignItems: "center" },
    screenTitle: { marginBottom: theme.spacing.md, textAlign: "center", width: "100%" },
    card: {
      width: "100%",
      maxWidth: 340,
      overflow: "hidden",
    },
    qrArea: {
      minHeight: 220,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    qrImage: { width: 180, height: 180 },
    qrPlaceholder: { fontSize: 14, marginTop: 12, textAlign: "center" },
    qrHint: { fontSize: 12, marginTop: 8 },
    eventName: { fontSize: 16, fontWeight: "600", paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
    orderId: { fontSize: 13, fontFamily: "monospace", paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
    storyBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      paddingVertical: 14,
      borderRadius: theme.radius.full,
    },
    storyBtnText: { fontSize: 15, fontWeight: "700" },
  });
}
