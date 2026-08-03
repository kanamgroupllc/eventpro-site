/**
 * Large horizontal carousel card — Stitch "Trending Now" featured event.
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";

const { width: SCREEN_W } = Dimensions.get("window");
export const FEATURED_CARD_WIDTH = Math.min(SCREEN_W - 32, 360);

function formatShortDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
}

type Props = {
  event: Event;
  minPrice: number | null;
  onPress: () => void;
  onFavoritePress?: () => void;
};

export function DiscoverFeaturedCard({ event, minPrice, onPress, onFavoritePress }: Props) {
  const { theme } = useTheme();
  const imageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
  const startRaw = event.startTime ?? (event as any).startDateTime;
  const venue = (event as any).venue ?? event.addressCity ?? "Venue TBA";
  const title = event.name ?? (event as any).title ?? "Event";

  const priceLabel =
    minPrice != null && minPrice > 0
      ? `Book now from $${Number.isInteger(minPrice) ? minPrice : minPrice.toFixed(0)}`
      : "Book now";

  const inner = (
    <>
        {!imageUrl ? (
          <View style={styles.placeholderCenter}>
            <Ionicons name="musical-notes" size={48} color={theme.colors.mutedForeground} />
          </View>
        ) : null}
        <View style={styles.scrim} />
        <View style={styles.badges}>
          <View style={styles.badgePink}>
            <Text style={styles.badgePinkText}>Featured event</Text>
          </View>
          <View style={styles.badgeBlue}>
            <Text style={styles.badgeBlueText} numberOfLines={1}>
              {formatShortDate(startRaw)} · {venue}
            </Text>
          </View>
        </View>
        <View style={styles.bottom}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.cta, { backgroundColor: theme.colors.primary }]} onPress={onPress} activeOpacity={0.9}>
              <Text style={[styles.ctaText, { color: theme.colors.primaryForeground }]}>{priceLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heartBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]}
              onPress={onFavoritePress ?? onPress}
              hitSlop={12}
            >
              <Ionicons name="heart-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
    </>
  );

  return (
    <TouchableOpacity
      style={[styles.wrap, { width: FEATURED_CARD_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {imageUrl ? (
        <ImageBackground source={{ uri: imageUrl }} style={styles.bg} resizeMode="cover">
          {inner}
        </ImageBackground>
      ) : (
        <View style={styles.bg}>{inner}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 24,
    overflow: "hidden",
    marginRight: 12,
  },
  bg: {
    minHeight: 320,
    width: "100%",
    justifyContent: "space-between",
  },
  placeholderCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  badges: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    gap: 8,
  },
  badgePink: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(236, 72, 153, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgePinkText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badgeBlue: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(59, 130, 246, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: "100%",
  },
  badgeBlueText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  bottom: {
    padding: 16,
    marginTop: "auto",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cta: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 15,
    fontWeight: "800",
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
});
