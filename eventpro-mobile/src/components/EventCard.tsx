/**
 * Event card matching web UI: image top (~60%), gradient overlay, category, title, date/time/venue, Get Tickets.
 * Uses useTheme() so dark mode applies.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { useSimulatedViewers } from "../hooks/useSimulatedViewers";

const CARD_IMAGE_HEIGHT = 200;

function formatDate(value: string | undefined): string {
  if (!value) return "Date TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Date TBD";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function formatTime(value: string | undefined): string {
  if (!value) return "Time TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Time TBD";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function EventCard({
  event,
  onPress,
}: {
  event: Event;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const viewers = useSimulatedViewers(event.id, 5, 28);
  const imageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
  const startRaw = event.startTime ?? (event as any).startDateTime;
  const category = event.categoryName ?? (event as any).category;
  const venue = (event as any).venue ?? event.addressCity;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image section ~60% of card */}
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="ticket" size={56} color={theme.colors.mutedForeground} />
          </View>
        )}
        <View style={styles.imageOverlay} />
        {category ? (
          <View style={[styles.categoryBadge, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
            <Text style={styles.categoryText} numberOfLines={1}>{category}</Text>
          </View>
        ) : null}
        <View style={[styles.viewingBadge, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
          <View style={styles.viewingBadgeDot} />
          <Text style={styles.viewingBadgeText}>{viewers} viewing</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={2}>
          {event.name || (event as any).title || "Event"}
        </Text>
        {event.description ? (
          <Text style={[styles.desc, { color: theme.colors.mutedForeground }]} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: theme.colors.primary + "20" }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.detailText, { color: theme.colors.foreground }]}>{formatDate(startRaw)}</Text>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.detailIcon, { backgroundColor: theme.colors.primary + "20" }]}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            </View>
            <Text style={[styles.detailText, { color: theme.colors.foreground }]}>{formatTime(startRaw)}</Text>
          </View>
          {venue ? (
            <View style={styles.detailRow}>
              <View style={[styles.detailIcon, { backgroundColor: theme.colors.primary + "20" }]}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.detailText, { color: theme.colors.foreground }]} numberOfLines={1}>{venue}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.colors.primary }]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Ionicons name="ticket-outline" size={20} color={theme.colors.primaryForeground} />
          <Text style={[styles.ctaText, { color: theme.colors.primaryForeground }]}>Get Tickets</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 20,
  },
  imageWrap: {
    height: CARD_IMAGE_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    // gradient-like: darker at bottom for text readability (we use a simple overlay)
    // React Native doesn't have CSS gradient; we could use expo-linear-gradient for parity
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  viewingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  viewingBadgeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#22d3ee" },
  viewingBadgeText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  content: {
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  details: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  detailText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
