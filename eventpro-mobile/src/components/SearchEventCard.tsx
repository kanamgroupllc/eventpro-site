import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";

const IMAGE_H = 200;

function formatMonthDay(value: string | undefined): { m: string; d: string } {
  if (!value) return { m: "—", d: "—" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { m: "—", d: "—" };
  return {
    m: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    d: String(d.getDate()),
  };
}

function formatDoors(value: string | undefined): string {
  if (!value) return "Doors TBD";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Doors TBD";
  return `Doors at ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * Stitch-style search result card: hero image with overlay title, category tag, favorite, bottom meta + price.
 */
export function SearchEventCard({
  event,
  onPress,
  priceLabel,
  isFree,
}: {
  event: Event;
  onPress: () => void;
  /** e.g. "$45.00" or "€45.00" — omit to show Get Ticket without price. */
  priceLabel?: string;
  isFree?: boolean;
}) {
  const { theme } = useTheme();
  const [fav, setFav] = useState(false);
  const imageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
  const startRaw = event.startTime ?? (event as any).startDateTime;
  const { m, d } = formatMonthDay(startRaw);
  const category = (event.categoryName ?? (event as any).category ?? "EVENT").toUpperCase();
  const subcat = "LIVE";
  const venue = (event as any).venue ?? event.addressCity ?? "Venue TBD";
  const city = event.addressCity ?? "";
  const venueLine = city ? `${venue}, ${city}` : venue;
  const title = event.name || (event as any).title || "Event";

  const showPrice = Boolean(priceLabel) || isFree;
  const priceText = isFree ? "FREE" : priceLabel ?? "";

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
      <TouchableOpacity style={styles.imageWrap} onPress={onPress} activeOpacity={0.92}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.ph, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="musical-notes" size={48} color={theme.colors.mutedForeground} />
          </View>
        )}
        <View style={styles.imageBottomGradient} />
        <TouchableOpacity
          style={[styles.favBtn, { backgroundColor: "#fff" }]}
          onPress={() => setFav(!fav)}
          hitSlop={8}
        >
          <Ionicons name={fav ? "heart" : "heart-outline"} size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={[styles.catTag, { backgroundColor: "rgba(236, 72, 153, 0.92)" }]}>
          <Text style={styles.catTagText} numberOfLines={1}>
            {category} • {subcat}
          </Text>
        </View>
        <Text style={styles.overlayTitle} numberOfLines={2}>
          {title}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.lower} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.dateBox, { backgroundColor: theme.colors.primary + "18" }]}>
          <Text style={[styles.dateMonth, { color: theme.colors.foreground }]}>{m}</Text>
          <Text style={[styles.dateDay, { color: theme.colors.foreground }]}>{d}</Text>
        </View>
        <View style={styles.meta}>
          <View style={styles.metaLine}>
            <Ionicons name="location-outline" size={16} color={theme.colors.mutedForeground} />
            <Text style={[styles.metaText, { color: theme.colors.foreground }]} numberOfLines={1}>
              {venueLine}
            </Text>
          </View>
          <Text style={[styles.metaSub, { color: theme.colors.mutedForeground }]}>
            {formatDoors(startRaw)} · 18+
          </Text>
        </View>
        <View style={styles.priceCol}>
          {showPrice ? (
            <Text style={[styles.price, { color: theme.colors.primary }]} numberOfLines={1}>
              {priceText}
            </Text>
          ) : null}
          {isFree ? (
            <View style={[styles.ctaGhost, { backgroundColor: theme.colors.primary + "20" }]}>
              <Text style={[styles.ctaGhostText, { color: theme.colors.primary }]}>Register</Text>
            </View>
          ) : (
            <View style={[styles.cta, { backgroundColor: theme.colors.primary }]}>
              <Text style={[styles.ctaText, { color: theme.colors.primaryForeground }]}>Get Ticket</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  imageWrap: { height: IMAGE_H, position: "relative" },
  image: { width: "100%", height: "100%" },
  ph: { flex: 1, justifyContent: "center", alignItems: "center" },
  imageBottomGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  catTag: {
    position: "absolute",
    bottom: 52,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "85%",
  },
  catTagText: { color: "#fff", fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  overlayTitle: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 56,
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  lower: {
    flexDirection: "row",
    padding: 14,
    alignItems: "center",
    gap: 12,
  },
  dateBox: {
    width: 48,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  dateMonth: { fontSize: 10, fontWeight: "800" },
  dateDay: { fontSize: 18, fontWeight: "800" },
  meta: { flex: 1, minWidth: 0 },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontWeight: "600", flex: 1 },
  metaSub: { fontSize: 12, marginTop: 4, marginLeft: 22 },
  priceCol: { alignItems: "flex-end", minWidth: 88 },
  price: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { fontSize: 12, fontWeight: "800" },
  ctaGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaGhostText: { fontSize: 12, fontWeight: "800" },
});
