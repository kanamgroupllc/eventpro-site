import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useRecentlyViewed } from "../contexts/RecentlyViewedContext";
import { useTheme } from "../contexts/ThemeContext";
import type { Event, TicketType } from "@eventpro/shared";
import { getPromotionalVideoEmbedUrl, getPromotionalVideoEmbedHtml, isEventEnded } from "@eventpro/shared";
import { WebView } from "react-native-webview";
import type { Theme } from "../theme";
import * as mobileApi from "../lib/mobileApi";
import { useSimulatedViewers } from "../hooks/useSimulatedViewers";
import { sectionLabel, editorialCard } from "../theme/screenStyles";

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.background },
    error: { padding: 24, color: theme.colors.mutedForeground },
    skeletonHero: { width: "100%", height: 300, backgroundColor: theme.colors.muted },
    skeletonBlock: { height: 20, borderRadius: 8, backgroundColor: theme.colors.muted, marginBottom: 12 },
    cover: { width: "100%", height: 200, backgroundColor: theme.colors.muted },
    heroWrap: { width: "100%", height: 380, backgroundColor: "#14052b" },
    heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
    heroGradientTop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "38%",
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    heroGradientBottom: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "62%",
      backgroundColor: "rgba(54, 39, 78, 0.82)",
    },
    heroInner: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
    heroBadgeCategory: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: "rgba(240, 171, 252, 0.92)",
    },
    heroBadgeCategoryText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "#63033a", textTransform: "uppercase" },
    heroBadgeStatus: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.35)",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    heroBadgeStatusText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "#ffffff", textTransform: "uppercase" },
    heroTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: "#ffffff",
      letterSpacing: -0.5,
      lineHeight: 36,
      marginBottom: 10,
      fontFamily: theme.fontFamily.heading,
    },
    heroExcerpt: { fontSize: 16, lineHeight: 22, color: "rgba(255,255,255,0.88)", marginBottom: 16 },
    heroDateCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.18)",
      backgroundColor: "rgba(255,255,255,0.1)",
      marginBottom: 12,
    },
    heroDateIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    heroDateIconText: { fontSize: 20 },
    heroDateLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" },
    heroDateValue: { fontSize: 16, fontWeight: "700", color: "#ffffff", marginTop: 2 },
    heroCta: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: theme.radius.full,
      alignItems: "center",
      shadowColor: "#5d3fd3",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 8,
    },
    heroCtaText: { color: theme.colors.primaryForeground, fontSize: 17, fontWeight: "800" },
    eventEndedText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600", marginTop: 4 },
    shareStoryBtn: {
      marginTop: 12,
      alignItems: "center",
      paddingVertical: 10,
    },
    shareStoryText: { color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
    coverPlaceholder: { width: "100%", height: 200, backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" },
    coverPlaceholderText: { color: theme.colors.mutedForeground },
    galleryThumbs: { flexGrow: 0, paddingHorizontal: theme.spacing.md, paddingVertical: 8, gap: 8 },
    galleryThumb: { width: 56, height: 56, borderRadius: 8, overflow: "hidden", marginRight: 8, borderWidth: 2, borderColor: "transparent" },
    galleryThumbActive: { borderColor: theme.colors.primary },
    galleryThumbImg: { width: "100%", height: "100%" },
    content: { padding: theme.spacing.md },
    title: { fontSize: 22, fontWeight: "700", marginBottom: 8, color: theme.colors.foreground },
    desc: { fontSize: 15, marginBottom: 12, color: theme.colors.mutedForeground },
    meta: { fontSize: 14, marginBottom: 8, color: theme.colors.mutedForeground },
    videoCta: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.radius.md, alignItems: "center", marginTop: 12, marginBottom: 8 },
    videoCtaText: { fontSize: 15, fontWeight: "600" },
    videoEmbed: { width: "100%", aspectRatio: 16 / 9, borderRadius: theme.radius.md, marginTop: 12, marginBottom: 8, overflow: "hidden", backgroundColor: theme.colors.muted },
    organizerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      marginBottom: 8,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    organizerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.muted },
    organizerAvatarPlaceholder: { justifyContent: "center", alignItems: "center" },
    organizerAvatarText: { fontSize: 16, fontWeight: "600", color: theme.colors.mutedForeground },
    organizerInfo: { marginLeft: 12, flex: 1 },
    organizerLabel: { fontSize: 12, color: theme.colors.mutedForeground, marginBottom: 2 },
    organizerName: { fontSize: 16, fontWeight: "600", color: theme.colors.foreground },
    followBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: "transparent" },
    followBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    followBtnText: { fontSize: 14, fontWeight: "600", color: theme.colors.foreground },
    followBtnTextActive: { color: theme.colors.primaryForeground },
    contactOrganizerBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, borderStyle: "dashed" },
    contactOrganizerBtnText: { fontSize: 14, fontWeight: "500", color: theme.colors.foreground },
    modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" },
    modalContent: { width: "90%", maxWidth: 400, borderRadius: theme.radius.lg, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
    modalSent: { marginBottom: 20 },
    inputLabel: { fontSize: 14, fontWeight: "500", marginBottom: 6 },
    contactInput: { borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 12 },
    contactMessageInput: { minHeight: 100, textAlignVertical: "top" },
    modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
    modalCloseBtn: { paddingVertical: 8 },
    contactSubmitBtn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: theme.radius.md },
    contactSubmitText: { fontWeight: "600" },
    modalCancelText: { fontSize: 15 },
    sectionTitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 12, color: theme.colors.foreground },
    aboutHeadlineRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
    aboutTitle: { fontSize: 22, fontWeight: "800", color: theme.colors.foreground, fontFamily: theme.fontFamily.heading },
    aboutRule: { flex: 1, height: 1, backgroundColor: theme.colors.border },
    aboutBody: { fontSize: 16, lineHeight: 24, color: theme.colors.mutedForeground },
    locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8, marginBottom: 4 },
    locationText: { flex: 1, fontSize: 15, color: theme.colors.mutedForeground },
    muted: { marginBottom: 16, color: theme.colors.mutedForeground },
    ticketRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    ticketInfo: { flex: 1 },
    ticketName: { fontSize: 16, fontWeight: "600", color: theme.colors.foreground },
    ticketMeta: { fontSize: 14, marginTop: 2, color: theme.colors.mutedForeground },
    stepper: { flexDirection: "row", alignItems: "center" },
    stepperBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" },
    stepperText: { fontSize: 18, fontWeight: "600", color: theme.colors.foreground },
    stepperInput: { width: 40, textAlign: "center", fontSize: 16, marginHorizontal: 8, color: theme.colors.foreground },
    button: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.radius.md, alignItems: "center", marginTop: 24 },
    buttonDisabled: { backgroundColor: theme.colors.muted },
    buttonText: { color: theme.colors.primaryForeground, fontWeight: "600" },
    seatMapCta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 12,
      paddingVertical: 14,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      backgroundColor: "transparent",
    },
    seatMapCtaText: { fontSize: 15, fontWeight: "700" },
    moreFromOrganizer: { marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border },
    horizontalList: { marginHorizontal: -theme.spacing.md, marginTop: 12 },
    ticketsCard: { padding: theme.spacing.md },
    otherEventCard: { width: 140, marginLeft: theme.spacing.md, overflow: "hidden" },
    otherEventImage: { width: 140, height: 88, backgroundColor: theme.colors.muted },
    otherEventName: { padding: 8, fontSize: 13, fontWeight: "600", color: theme.colors.foreground },
    viewAllLink: { marginTop: 12, paddingVertical: 8 },
    viewAllLinkText: { fontSize: 14, color: theme.colors.primary, fontWeight: "500" },
    liveBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
      backgroundColor: "rgba(0,0,0,0.25)",
      marginBottom: 12,
    },
    liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22d3ee" },
    liveBadgeText: { fontSize: 12, fontWeight: "600", color: theme.colors.foreground },
    stickyBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 12,
    },
    stickyLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 0.8,
      color: theme.colors.mutedForeground,
      textTransform: "uppercase",
    },
    stickyPrice: { fontSize: 20, fontWeight: "800", color: theme.colors.foreground, marginTop: 2 },
    stickyPer: { fontSize: 12, fontWeight: "500", color: theme.colors.mutedForeground },
    stickyCta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 22,
      borderRadius: theme.radius.full,
    },
    stickyCtaText: { color: theme.colors.primaryForeground, fontWeight: "800", fontSize: 16 },
  });
}

export function EventDetailScreen({
  route,
  navigation,
}: {
  route: { params: { eventId: string } };
  navigation: any;
}) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { api, user } = useAuth();
  const viewers = useSimulatedViewers(route.params.eventId, 8, 32);
  const { addRecentlyViewed } = useRecentlyViewed();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [otherEventsByOrganizer, setOtherEventsByOrganizer] = useState<Event[]>([]);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactForm, setContactForm] = useState({ senderName: "", senderEmail: "", message: "" });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [followedOrganizerIds, setFollowedOrganizerIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState(false);
  const [organizerProfile, setOrganizerProfile] = useState<mobileApi.OrganizerPublicProfile | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const minTicketPrice = useMemo(() => {
    if (!ticketTypes.length) return null;
    return Math.min(...ticketTypes.map((t) => Number(t.price)));
  }, [ticketTypes]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getEvent(route.params.eventId),
      api.getTicketTypes(route.params.eventId),
    ])
      .then(([eventData, tickets]) => {
        if (!cancelled) {
          setEvent(eventData);
          if (eventData) addRecentlyViewed(eventData);
          setTicketTypes(tickets);
        }
      })
      .catch(() => {
        if (!cancelled) setEvent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, route.params.eventId, addRecentlyViewed]);

  useEffect(() => {
    if (!event?.userId || !route.params.eventId) return;
    api
      .getEvents(1, 6, undefined, event.userId)
      .then((list) => setOtherEventsByOrganizer(list.filter((e) => e.id !== route.params.eventId)))
      .catch(() => setOtherEventsByOrganizer([]));
  }, [api, event?.userId, route.params.eventId]);

  // Load followed organizers only when user is logged in (API requires auth)
  useEffect(() => {
    if (!user || !event?.userId) return;
    mobileApi
      .getFollowing()
      .then((list) => {
        const ids = new Set<string>(
          list.map((o) => String((o as { organizerId?: string }).organizerId ?? (o as { id?: string }).id ?? "")).filter(Boolean)
        );
        setFollowedOrganizerIds(ids);
      })
      .catch(() => setFollowedOrganizerIds(new Set()));
  }, [user, event?.userId]);

  // Retrieve organizer display info from their profile (name, photo)
  useEffect(() => {
    if (!event?.userId) {
      setOrganizerProfile(null);
      return;
    }
    mobileApi
      .getOrganizerPublicProfile(event.userId)
      .then(setOrganizerProfile)
      .catch(() => setOrganizerProfile(null));
  }, [event?.userId]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [event?.id]);

  const organizerFirstName = organizerProfile?.firstName ?? event?.organizerFirstName ?? null;
  const organizerLastName = organizerProfile?.lastName ?? event?.organizerLastName ?? null;
  const organizerProfilePictureUrl = organizerProfile?.profilePictureUrl ?? event?.organizerProfilePictureUrl ?? null;
  const organizerDisplayName = [organizerFirstName, organizerLastName].filter(Boolean).join(" ").trim() || "Event organizer";

  const openSelectTickets = () => {
    if (!event) return;
    if (isEventEnded(event)) return;
    navigation.navigate("SelectTickets", { eventId: event.id });
  };

  const eventEnded = event ? isEventEnded(event) : false;
  const ticketsAvailable = ticketTypes.length > 0 && !eventEnded;

  const openShareStory = () => {
    if (!event) return;
    const st = event.startTime ?? (event as { startDateTime?: string }).startDateTime;
    const dateLabel = st
      ? new Date(st).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }).toUpperCase()
      : undefined;
    const venue = [(event as { venue?: string }).venue, event.addressCity].filter(Boolean).join(", ") || undefined;
    const doors = st ? new Date(st).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : undefined;
    navigation.navigate("TikTokShareTemplate", {
      eventName: event.name,
      venue,
      dateLabel,
      doors,
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={styles.skeletonHero} />
        <View style={{ padding: theme.spacing.md, gap: 12 }}>
          <View style={[styles.skeletonBlock, { width: "72%" }]} />
          <View style={[styles.skeletonBlock, { width: "100%", height: 80 }]} />
          <View style={[styles.skeletonBlock, { width: "90%", height: 14 }]} />
          <View style={[styles.skeletonBlock, { width: "40%" }]} />
        </View>
      </View>
    );
  }
  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Event not found.</Text>
      </View>
    );
  }

  const mainImageUrl = (event as any).imageUrl ?? (event as any).coverImageUrl;
  const additionalUrls = (event as any).additionalImageUrls ?? [];
  const galleryImages = mainImageUrl ? [mainImageUrl, ...additionalUrls] : [...additionalUrls];
  const showGallery = galleryImages.length > 1;
  const imageUrl = galleryImages[galleryIndex] ?? mainImageUrl;
  const startTime = event.startTime ?? (event as any).startDateTime;
  const locationLine = [(event as any).venue, event.addressCity, event.addressState].filter(Boolean).join(", ");
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: ticketsAvailable ? 100 : theme.spacing.md }}
    >
      <View style={styles.heroWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: theme.colors.muted, justifyContent: "center", alignItems: "center" }]}>
            <Text style={styles.coverPlaceholderText}>No image</Text>
          </View>
        )}
        <View style={styles.heroGradientTop} />
        <View style={styles.heroGradientBottom} />
        <View style={[styles.heroInner, { paddingTop: insets.top + 12 }]}>
          <View style={styles.heroBadges}>
            {(event.categoryName || event.category) ? (
              <View style={styles.heroBadgeCategory}>
                <Text style={styles.heroBadgeCategoryText}>{event.categoryName || event.category}</Text>
              </View>
            ) : null}
            {event.status ? (
              <View style={styles.heroBadgeStatus}>
                <Text style={styles.heroBadgeStatusText}>{event.status}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.heroTitle}>{event.name}</Text>
          {event.description ? (
            <Text style={styles.heroExcerpt} numberOfLines={3}>
              {event.description}
            </Text>
          ) : null}
          {startTime ? (
            <View style={styles.heroDateCard}>
              <View style={styles.heroDateIcon}>
                <Text style={styles.heroDateIconText}>📅</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroDateLabel}>Date & time</Text>
                <Text style={styles.heroDateValue}>
                  {new Date(startTime).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
              </View>
            </View>
          ) : null}
          {ticketsAvailable ? (
          <TouchableOpacity style={styles.heroCta} onPress={openSelectTickets} activeOpacity={0.9}>
            <Text style={styles.heroCtaText}>
              Get tickets{minTicketPrice != null ? ` — From $${Math.round(minTicketPrice)}` : ""}
            </Text>
          </TouchableOpacity>
          ) : eventEnded ? (
            <Text style={styles.eventEndedText}>This event has ended. Ticket sales are closed.</Text>
          ) : null}
          <TouchableOpacity style={styles.shareStoryBtn} onPress={openShareStory} activeOpacity={0.85}>
            <Text style={styles.shareStoryText}>Share story template</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showGallery && galleryImages.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryThumbs}>
          {galleryImages.map((url, i) => (
            <TouchableOpacity key={url + i} onPress={() => setGalleryIndex(i)} style={[styles.galleryThumb, i === galleryIndex && styles.galleryThumbActive]}>
              <Image source={{ uri: url }} style={styles.galleryThumbImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.content}>
        <Text style={[sectionLabel(theme), { marginBottom: 10 }]}>The experience</Text>
        <View style={styles.aboutHeadlineRow}>
          <Text style={styles.aboutTitle}>About the experience</Text>
          <View style={styles.aboutRule} />
        </View>
        {event.description ? (
          <Text style={styles.aboutBody}>{event.description}</Text>
        ) : null}
        {locationLine ? (
          <View style={styles.locationRow}>
            <Text style={{ fontSize: 16, color: theme.colors.primary }}>📍</Text>
            <Text style={styles.locationText}>{locationLine}</Text>
          </View>
        ) : null}

        {/* Live viewing badge (matches web) */}
        <View style={[styles.liveBadge, { borderColor: theme.colors.border, backgroundColor: theme.colors.muted + "99" }]}>
          <View style={styles.liveBadgeDot} />
          <Text style={[styles.liveBadgeText, { color: theme.colors.foreground }]}>{viewers} people viewing now</Text>
        </View>

        {/* Promotional video */}
        {event.promotionalVideoUrl ? (
          getPromotionalVideoEmbedUrl(event.promotionalVideoUrl) ? (
            <View style={styles.videoEmbed}>
              <WebView
                source={{
                  html: getPromotionalVideoEmbedHtml(getPromotionalVideoEmbedUrl(event.promotionalVideoUrl)!),
                  baseUrl: "https://eventpro.com",
                }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                allowsInlineMediaPlayback
                originWhitelist={["https://*", "http://*"]}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.videoCta, { backgroundColor: theme.colors.primary }]}
              onPress={() => Linking.openURL(event.promotionalVideoUrl!)}
            >
              <Text style={[styles.videoCtaText, { color: theme.colors.primaryForeground }]}>Watch promotional video</Text>
            </TouchableOpacity>
          )
        ) : null}

        {/* Organizer — name and avatar (from organizer's profile when available) */}
        {(event.userId || organizerFirstName || organizerLastName) ? (
          <View style={styles.organizerRow}>
            {organizerProfilePictureUrl ? (
              <Image
                source={{ uri: organizerProfilePictureUrl }}
                style={styles.organizerAvatar}
              />
            ) : (
              <View style={[styles.organizerAvatar, styles.organizerAvatarPlaceholder]}>
                <Text style={styles.organizerAvatarText}>
                  {[organizerFirstName, organizerLastName]
                    .filter(Boolean)
                    .map((s) => (s ?? "").charAt(0))
                    .join("") || "?"}
                </Text>
              </View>
            )}
            <View style={styles.organizerInfo}>
              <Text style={styles.organizerLabel}>Organized by</Text>
              <Text style={styles.organizerName}>
                {organizerDisplayName}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.followBtn,
                event.userId != null && followedOrganizerIds.has(event.userId) && styles.followBtnActive,
                followLoading && styles.buttonDisabled,
              ]}
              disabled={followLoading}
              onPress={async () => {
                if (!event.userId) return;
                if (!user) {
                  (navigation as any).getParent()?.getParent()?.navigate("Auth", { screen: "Login" });
                  return;
                }
                setFollowLoading(true);
                try {
                  const organizerId = String(event.userId);
                  if (followedOrganizerIds.has(organizerId)) {
                    await mobileApi.unfollowOrganizer(organizerId);
                    setFollowedOrganizerIds((s) => { const n = new Set(s); n.delete(organizerId); return n; });
                  } else {
                    await mobileApi.followOrganizer(organizerId);
                    setFollowedOrganizerIds((s) => new Set(s).add(organizerId));
                  }
                  // Refetch to stay in sync with backend
                  const list = await mobileApi.getFollowing();
                  const ids = new Set<string>(list.map((o) => String((o as { organizerId?: string }).organizerId ?? (o as { id?: string }).id ?? "")).filter(Boolean));
                  setFollowedOrganizerIds(ids);
                } catch (e) {
                  console.warn("Follow/unfollow failed", e);
                } finally {
                  setFollowLoading(false);
                }
              }}
            >
              <Text style={[styles.followBtnText, event.userId != null && followedOrganizerIds.has(event.userId) && styles.followBtnTextActive]}>
                {followLoading ? "…" : event.userId != null && followedOrganizerIds.has(event.userId) ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.contactOrganizerBtn}
              onPress={() => { setContactModalVisible(true); setContactSent(false); setContactForm({ senderName: "", senderEmail: "", message: "" }); }}
            >
              <Text style={styles.contactOrganizerBtnText}>Contact organizer</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* More from this organizer */}
      {event.userId && otherEventsByOrganizer.length > 0 ? (
        <View style={[styles.content, styles.moreFromOrganizer]}>
          <Text style={[sectionLabel(theme), { marginBottom: 12 }]}>More from organizer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {otherEventsByOrganizer.slice(0, 5).map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[editorialCard(theme), styles.otherEventCard]}
                onPress={() => navigation.navigate("EventDetail", { eventId: e.id })}
              >
                <Image
                  source={{ uri: (e as any).imageUrl ?? (e as any).coverImageUrl ?? "" }}
                  style={styles.otherEventImage}
                />
                <Text style={styles.otherEventName} numberOfLines={2}>{e.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={() => navigation.navigate("EventsList", { organizerId: event.userId })}
            style={styles.viewAllLink}
          >
            <Text style={styles.viewAllLinkText}>View all events by this organizer →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>

    <Modal visible={contactModalVisible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
        <View style={[editorialCard(theme), styles.modalContent, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>Contact organizer</Text>
          {contactSent ? (
            <>
              <Text style={[styles.modalSent, { color: theme.colors.mutedForeground }]}>
                Your message has been sent. The organizer will get back to you by email.
              </Text>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setContactModalVisible(false)}>
                <Text style={styles.viewAllLinkText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.inputLabel, { color: theme.colors.foreground }]}>Your name (optional)</Text>
              <TextInput
                style={[styles.contactInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.foreground }]}
                value={contactForm.senderName}
                onChangeText={(t) => setContactForm((f) => ({ ...f, senderName: t }))}
                placeholder="Jane Doe"
                placeholderTextColor={theme.colors.mutedForeground}
                maxLength={200}
              />
              <Text style={[styles.inputLabel, { color: theme.colors.foreground }]}>Your email *</Text>
              <TextInput
                style={[styles.contactInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.foreground }]}
                value={contactForm.senderEmail}
                onChangeText={(t) => setContactForm((f) => ({ ...f, senderEmail: t }))}
                placeholder="you@example.com"
                placeholderTextColor={theme.colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={[styles.inputLabel, { color: theme.colors.foreground }]}>Message *</Text>
              <TextInput
                style={[styles.contactInput, styles.contactMessageInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.foreground }]}
                value={contactForm.message}
                onChangeText={(t) => setContactForm((f) => ({ ...f, message: t }))}
                placeholder="Your message to the organizer..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                maxLength={2000}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setContactModalVisible(false)}>
                  <Text style={[styles.modalCancelText, { color: theme.colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactSubmitBtn, { backgroundColor: theme.colors.primary }]}
                  disabled={contactSubmitting || !contactForm.senderEmail.trim() || !contactForm.message.trim()}
                  onPress={async () => {
                    if (!event?.id || !contactForm.senderEmail.trim() || !contactForm.message.trim()) return;
                    setContactSubmitting(true);
                    try {
                      await api.contactOrganizer(event.id, {
                        senderEmail: contactForm.senderEmail.trim(),
                        senderName: contactForm.senderName.trim() || undefined,
                        message: contactForm.message.trim(),
                      });
                      setContactSent(true);
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setContactSubmitting(false);
                    }
                  }}
                >
                  <Text style={[styles.contactSubmitText, { color: theme.colors.primaryForeground }]}>
                    {contactSubmitting ? "Sending…" : "Send message"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {ticketsAvailable ? (
      <View style={[styles.stickyBar, { paddingBottom: insets.bottom, borderTopColor: theme.colors.border }]}>
        <View>
          <Text style={styles.stickyLabel}>Starting at</Text>
          <Text style={styles.stickyPrice}>
            {minTicketPrice != null ? `$${Number(minTicketPrice).toFixed(2)}` : "—"}
            <Text style={styles.stickyPer}> / person</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.stickyCta} onPress={openSelectTickets} activeOpacity={0.9}>
          <Text style={styles.stickyCtaText}>Get tickets</Text>
        </TouchableOpacity>
      </View>
    ) : null}
    </View>
  );
}
