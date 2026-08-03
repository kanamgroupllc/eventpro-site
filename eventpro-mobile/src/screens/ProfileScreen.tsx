import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
  Alert,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { FollowedOrganizer, Order, OrganizerSummary } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { uploadProfilePicture as uploadProfilePictureMobile } from "../lib/mobileApi";
import { editorialCard, pageTitle } from "../theme/screenStyles";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "http://localhost:5173";

export function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, api, logout, hasRole, refreshUser } = useAuth();
  const { theme } = useTheme();
  const [summary, setSummary] = useState<OrganizerSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [followingList, setFollowingList] = useState<FollowedOrganizer[]>([]);
  const [ordersMeta, setOrdersMeta] = useState({ tickets: 0, orders: 0 });

  const isOrganizer = hasRole("ORGANIZER");
  const verificationStatus = user?.verificationStatus ?? "NOT_STARTED";
  const isVerified = Boolean(user?.isVerified) || verificationStatus === "VERIFIED";
  const verificationInProgress = verificationStatus === "PENDING" || verificationStatus === "IN_PROGRESS";
  const isPro = user?.subscriptionTier === "PRO";
  const isEnterprise = user?.subscriptionTier === "ENTERPRISE";
  const isProOrEnterprise = isPro || isEnterprise;
  const riskLevel = user?.riskLevel ?? summary?.riskLevel ?? "LOW";
  const isHighRisk = riskLevel === "HIGH";
  const payoutBalance = summary ? Number(summary.availableBalance) || 0 : 0;
  const platformFeesWithheld = summary ? Number(summary.platformFeesWithheld ?? 0) : 0;
  const riskFlagged = summary?.riskFlagged ?? false;

  const fetchSummary = useCallback(() => {
    if (!isOrganizer) {
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    api
      .getOrganizerSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [api, isOrganizer]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (!isOrganizer || verificationStatus !== "REJECTED") {
      setRejectionReason(null);
      return;
    }
    api.getVerificationStatus().then((res) => setRejectionReason(res.lastRejectionReason ?? null)).catch(() => setRejectionReason(null));
  }, [api, isOrganizer, verificationStatus]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .getFollowing()
      .then((list) => {
        if (!cancelled) setFollowingList(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setFollowingList([]);
      });
    api
      .getOrders(1, 100)
      .then((raw) => {
        if (cancelled) return;
        const list = Array.isArray(raw) ? raw : [];
        let tickets = 0;
        list.forEach((o: Order) => {
          const items = o.tickets as { quantity?: number }[] | undefined;
          if (Array.isArray(items)) {
            items.forEach((t) => {
              tickets += typeof t.quantity === "number" ? t.quantity : 1;
            });
          }
        });
        setOrdersMeta({ tickets, orders: list.length });
      })
      .catch(() => {
        if (!cancelled) setOrdersMeta({ tickets: 0, orders: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [api, user]);

  const openWeb = (path: string) => {
    Linking.openURL(`${WEB_URL}${path}`).catch(() => {});
  };

  const goToOrganizer = () => {
    navigation.getParent()?.navigate("Organizer");
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    return user?.email?.[0]?.toUpperCase() ?? "U";
  };

  const handleChangePhoto = useCallback(async () => {
    if (uploadingPhoto) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photos to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      await uploadProfilePictureMobile({
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "profile.jpg",
      });
      await refreshUser();
    } catch (e) {
      Alert.alert("Upload failed", "Could not update profile picture. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }, [refreshUser, uploadingPhoto]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User";
  const specialtyLabel = user?.culturalNiche
    ? `Focus: ${user.culturalNiche}`
    : isOrganizer
      ? "Focus: Cultural & Community Events"
      : null;

  // Guest view: same as web – browse first, sign in only when needed
  if (!user) {
    return (
      <View style={[styles.guestContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[editorialCard(theme), styles.guestCard]}>
          <View style={[styles.guestIconWrap, { backgroundColor: theme.colors.primary + "20" }]}>
            <Ionicons name="person-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={[pageTitle(theme), { textAlign: "center", marginBottom: 8 }]}>Welcome to KanamEvents</Text>
          <Text style={[styles.guestSubtitle, { color: theme.colors.mutedForeground }]}>
            Sign in to get tickets, follow organizers, and manage your orders.
          </Text>
          <TouchableOpacity
            style={[styles.guestButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => (navigation as any).getParent()?.getParent()?.navigate("Auth", { screen: "Login" })}
          >
            <Text style={[styles.guestButtonText, { color: theme.colors.primaryForeground }]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.guestButtonOutline, { borderColor: theme.colors.primary }]}
            onPress={() => (navigation as any).getParent()?.getParent()?.navigate("Auth", { screen: "SignUp" })}
          >
            <Text style={[styles.guestButtonOutlineText, { color: theme.colors.primary }]}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stitchMemberLabel = isPro ? "PRO MEMBER" : isEnterprise ? "ENTERPRISE" : "MEMBER";
  const memberYear = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9F8FF" }} edges={["top"]}>
      <ScrollView
        style={[styles.container, { backgroundColor: "#F9F8FF" }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stitchNav}>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")} hitSlop={12}>
            <Ionicons name="menu" size={26} color="#2D2D2D" />
          </TouchableOpacity>
          <Text style={styles.stitchBrand}>KanamEvents</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProfileEdit")}>
            {user?.profilePictureUrl ? (
              <Image source={{ uri: user.profilePictureUrl }} style={styles.stitchNavAvatarImg} />
            ) : (
              <View style={[styles.stitchNavAvatar, { backgroundColor: theme.colors.primary + "35" }]}>
                <Text style={{ color: theme.colors.primary, fontWeight: "800" }}>{getInitials()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <LinearGradient colors={["#b8a9ff", "#6d28d9"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.heroGradient}>
          {memberYear ? (
            <Text style={styles.stitchMemberSince}>Member since {memberYear}</Text>
          ) : null}
          <TouchableOpacity
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
            style={[styles.stitchAvatarWrap, { borderColor: "rgba(255,255,255,0.5)" }]}
            activeOpacity={0.85}
          >
            {user?.profilePictureUrl ? (
              <Image key={user.profilePictureUrl} source={{ uri: user.profilePictureUrl }} style={styles.stitchAvatarImg} />
            ) : (
              <Text style={styles.stitchAvatarInitials}>{getInitials()}</Text>
            )}
            {uploadingPhoto ? (
              <View style={styles.stitchAvatarOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={[styles.stitchEditBadge, { backgroundColor: "#4c1d95" }]}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.stitchHeroName}>{displayName}</Text>
          <Text style={styles.stitchHeroEmail}>{user?.email ?? ""}</Text>
          {user?.bio ? <Text style={styles.stitchBio}>{user.bio}</Text> : null}
          {!user?.bio && specialtyLabel ? <Text style={styles.stitchHeroSub}>{specialtyLabel}</Text> : null}
          {user?.bio && specialtyLabel ? <Text style={styles.stitchHeroSubDim}>{specialtyLabel}</Text> : null}
          <View style={styles.stitchHeroBadges}>
            <View style={styles.stitchPill}>
              <Text style={styles.stitchPillText}>{stitchMemberLabel}</Text>
            </View>
            {isOrganizer ? (
              <View style={styles.stitchPill}>
                <Text style={styles.stitchPillText}>{summary?.eventsHosted ?? 0} events hosted</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatNum}>{ordersMeta.tickets}</Text>
              <Text style={styles.heroStatLab}>Tickets</Text>
            </View>
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatNum}>{ordersMeta.orders}</Text>
              <Text style={styles.heroStatLab}>Orders</Text>
            </View>
            <View style={styles.heroStatCell}>
              <Text style={styles.heroStatNum}>{followingList.length}</Text>
              <Text style={styles.heroStatLab}>Following</Text>
            </View>
          </View>
          {isOrganizer &&
            (isVerified ? null : verificationInProgress ? (
              <View style={styles.stitchPill}>
                <Text style={styles.stitchPillText}>Verification in progress</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.stitchHeroLink} onPress={() => openWeb("/profile")}>
                <Text style={styles.stitchHeroLinkText}>
                  {verificationStatus === "REJECTED" ? "Resubmit verification" : "Complete verification"}
                </Text>
              </TouchableOpacity>
            ))}
        </LinearGradient>

        <View style={styles.dashHeader}>
          <Text style={[styles.dashTitle, { color: "#2D2D2D" }]}>Account Dashboard</Text>
          <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
            <Text style={styles.dashManage}>MANAGE</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dashRow}>
          <TouchableOpacity
            style={[styles.dashCard, { backgroundColor: theme.colors.primary + "18" }]}
            onPress={() => navigation.navigate("OrderHistory")}
          >
            <View style={[styles.dashIcon, { backgroundColor: theme.colors.primary + "35" }]}>
              <Ionicons name="ticket" size={22} color={theme.colors.primary} />
            </View>
            <Text style={[styles.dashCardTitle, { color: "#2D2D2D" }]}>My Orders</Text>
            <Text style={[styles.dashCardSub, { color: theme.colors.mutedForeground }]}>
              {ordersMeta.orders} orders · {ordersMeta.tickets} tickets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dashCard, { backgroundColor: "#fce7f3" }]}
            onPress={() => navigation.navigate("Following")}
          >
            <View style={[styles.dashIcon, { backgroundColor: "#f9a8d4" }]}>
              <Ionicons name="heart" size={22} color="#b03060" />
            </View>
            <Text style={[styles.dashCardTitle, { color: "#2D2D2D" }]}>Following</Text>
            <Text style={[styles.dashCardSub, { color: theme.colors.mutedForeground }]}>
              {followingList.length} organizers
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.discoverRow, { backgroundColor: theme.colors.primary + "14", borderColor: theme.colors.primary + "35" }]}
          onPress={() => navigation.getParent()?.navigate("Discover", { screen: "Home" })}
          activeOpacity={0.9}
        >
          <View style={[styles.dashIcon, { backgroundColor: theme.colors.primary + "30" }]}>
            <Ionicons name="compass" size={22} color={theme.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dashCardTitle, { color: "#2D2D2D" }]}>Discover events</Text>
            <Text style={[styles.dashCardSub, { color: theme.colors.mutedForeground }]}>Browse and save events</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.colors.mutedForeground} />
        </TouchableOpacity>

        {followingList.length > 0 ? (
          <View style={styles.followingBlock}>
            <View style={styles.followingHeader}>
              <Text style={[styles.followingTitle, { color: "#2D2D2D" }]}>Following</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Following")}>
                <Text style={{ color: theme.colors.primary, fontWeight: "700", fontSize: 13 }}>View all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.followingScroll}>
              {followingList.map((f) => {
                const orgLabel = [f.firstName, f.lastName].filter(Boolean).join(" ") || "Organizer";
                const initials = `${f.firstName?.[0] ?? ""}${f.lastName?.[0] ?? ""}`.trim() || "?";
                return (
                  <View key={f.organizerId} style={styles.followingChip}>
                    {f.profilePictureUrl ? (
                      <Image source={{ uri: f.profilePictureUrl }} style={styles.followingAvatar} />
                    ) : (
                      <View style={[styles.followingAvatar, styles.followingAvatarPh, { backgroundColor: theme.colors.primary + "25" }]}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
                          {initials.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.followingName, { color: theme.colors.mutedForeground }]} numberOfLines={2}>
                      {orgLabel}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={[editorialCard(theme), styles.accountGrid]}>
          <Text style={[styles.accountGridTitle, { color: theme.colors.mutedForeground }]}>ACCOUNT</Text>
          <View style={styles.accountGridRow}>
            <TouchableOpacity
              style={[styles.accountTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.muted + "55" }]}
              onPress={() => navigation.navigate("ProfileEdit")}
            >
              <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.accountTileTitle, { color: theme.colors.foreground }]}>Edit profile</Text>
              <Text style={[styles.accountTileSub, { color: theme.colors.mutedForeground }]}>Name & bio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accountTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.muted + "55" }]}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.accountTileTitle, { color: theme.colors.foreground }]}>Security</Text>
              <Text style={[styles.accountTileSub, { color: theme.colors.mutedForeground }]}>Password & prefs</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.accountGridRow}>
            <TouchableOpacity
              style={[styles.accountTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.muted + "55" }]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.accountTileTitle, { color: theme.colors.foreground }]}>Notifications</Text>
              <Text style={[styles.accountTileSub, { color: theme.colors.mutedForeground }]}>Alerts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.accountTile, { borderColor: theme.colors.border, backgroundColor: theme.colors.muted + "55" }]}
              onPress={() => navigation.navigate("HelpCenter")}
            >
              <Ionicons name="help-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={[styles.accountTileTitle, { color: theme.colors.foreground }]}>Help</Text>
              <Text style={[styles.accountTileSub, { color: theme.colors.mutedForeground }]}>FAQs & support</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[editorialCard(theme), styles.settingsCard]}>
          <View style={[styles.settingsRow, { borderBottomColor: theme.colors.border }]}>
            <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary + "18" }]}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.settingsCopy}>
              <Text style={[styles.settingsTitle, { color: theme.colors.foreground }]}>Push Notifications</Text>
              <Text style={[styles.settingsSub, { color: theme.colors.mutedForeground }]}>
                Alerts for new events & updates
              </Text>
            </View>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: theme.colors.primary }} />
          </View>
          <TouchableOpacity
            style={[styles.settingsRow, { borderBottomColor: theme.colors.border }]}
            onPress={() => navigation.navigate("Settings")}
          >
            <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary + "18" }]}>
              <Ionicons name="mail-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.settingsCopy}>
              <Text style={[styles.settingsTitle, { color: theme.colors.foreground }]}>Email Marketing</Text>
              <Text style={[styles.settingsSub, { color: theme.colors.mutedForeground }]}>Weekly curated newsletters</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsRow} onPress={() => openWeb("/settings")}>
            <View style={[styles.settingsIcon, { backgroundColor: theme.colors.primary + "18" }]}>
              <Ionicons name="card-outline" size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.settingsCopy}>
              <Text style={[styles.settingsTitle, { color: theme.colors.foreground }]}>Payment Methods</Text>
              <Text style={[styles.settingsSub, { color: theme.colors.mutedForeground }]}>Manage on web</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBar} onPress={() => logout()} activeOpacity={0.9}>
          <Ionicons name="log-out-outline" size={22} color="#b03060" />
          <Text style={styles.logoutBarText}>Log Out</Text>
        </TouchableOpacity>

      {/* Rejection card */}
      {isOrganizer && verificationStatus === "REJECTED" && (
        <View style={[styles.alertCard, styles.alertDanger]}>
          <Text style={styles.alertTitle}>Verification declined</Text>
          <Text style={styles.alertDesc}>
            {rejectionReason || "We couldn’t verify your information. Please resubmit with correct details on the web."}
          </Text>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.destructive }]} onPress={() => openWeb("/profile")}>
            <Text style={[styles.outlineBtnText, { color: theme.colors.destructive }]}>Resubmit on web</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* High risk */}
      {isOrganizer && isHighRisk && (
        <View style={[styles.alertCard, styles.alertWarning]}>
          <Ionicons name="warning" size={22} color={theme.colors.warning} />
          <View style={styles.alertText}>
            <Text style={styles.alertTitle}>High risk designation</Text>
            <Text style={styles.alertDesc}>Payouts may be delayed. Contact support for details.</Text>
          </View>
        </View>
      )}

      {/* Payout risk (organizer) */}
      {isOrganizer && (
        <View style={[editorialCard(theme), styles.card]}>
          <View style={styles.cardRow}>
            <View style={[styles.tileIcon, { backgroundColor: theme.colors.primary + "20" }]}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.tileContent}>
              <Text style={[styles.tileLabel, { color: theme.colors.mutedForeground }]}>Payout risk</Text>
              <Text style={[styles.tileValue, { color: theme.colors.foreground }]}>{riskLevel.charAt(0) + riskLevel.slice(1).toLowerCase()}</Text>
              {summary?.payoutEligibility?.label ? (
                <Text style={[styles.tileHint, { color: theme.colors.mutedForeground }]}>{summary.payoutEligibility.label}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={[styles.outlineBtnSmall, { borderColor: theme.colors.border }]} onPress={() => openWeb("/profile")}>
              <Text style={[styles.outlineBtnText, { color: theme.colors.foreground }]}>Refresh (web)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Current tier (organizer) */}
      {isOrganizer && (
        <View style={[editorialCard(theme), styles.card]}>
          <Text style={[styles.tileLabel, { color: theme.colors.mutedForeground }]}>Current tier</Text>
          {isProOrEnterprise ? (
            <>
              <Text style={[styles.tierName, { color: theme.colors.primary }]}>KanamEvents Pro</Text>
              <Text style={[styles.tierDesc, { color: theme.colors.mutedForeground }]}>Lower fees · Instant payouts · White-label</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Pricing")}>
                <Text style={[styles.linkPrimary, { color: theme.colors.primary }]}>Manage plan →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.tierName, { color: theme.colors.foreground }]}>Starter</Text>
              <Text style={[styles.tierDesc, { color: theme.colors.mutedForeground }]}>Standard fees · 3-day payouts</Text>
              <TouchableOpacity style={[styles.primaryBtnSmall, { backgroundColor: theme.colors.primary }]} onPress={() => navigation.navigate("Pricing")}>
                <Text style={[styles.primaryBtnText, { color: theme.colors.primaryForeground }]}>Upgrade to Pro</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Data & Privacy */}
      <TouchableOpacity style={[editorialCard(theme), styles.card]} onPress={() => openWeb("/privacy")}>
        <View style={styles.cardRow}>
          <View style={[styles.tileIcon, { backgroundColor: theme.colors.primary + "20" }]}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.tileContent}>
            <Text style={[styles.tileLabel, { color: theme.colors.mutedForeground }]}>Your Data & Privacy</Text>
            <Text style={[styles.tileValue, { color: theme.colors.foreground }]}>View data we collect · Request deletion</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={theme.colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {/* Team Management (Pro/Enterprise) */}
      {isProOrEnterprise && (
        <View style={[editorialCard(theme), styles.card]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={22} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Team Management</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: theme.colors.mutedForeground }]}>Invite team members and manage roles on the web app.</Text>
          <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.border }]} onPress={() => openWeb("/profile")}>
            <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>Manage on web</Text>
            <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Enterprise: White-Label & API keys */}
      {isEnterprise && (
        <>
          <View style={[editorialCard(theme), styles.card]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette" size={22} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>White-Label Branding</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: theme.colors.mutedForeground }]}>Custom logo and colors on your event pages.</Text>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.border }]} onPress={() => openWeb("/profile")}>
              <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>Manage on web</Text>
              <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={[editorialCard(theme), styles.card]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key" size={22} color={theme.colors.primary} />
              <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>API keys</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: theme.colors.mutedForeground }]}>Programmatic access. Create and revoke keys on the web.</Text>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.border }]} onPress={() => openWeb("/profile")}>
              <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>Manage on web</Text>
              <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Your Impact (organizer) */}
      {isOrganizer && (
        <View style={[editorialCard(theme), styles.card, styles.impactCard, { borderColor: theme.colors.primary + "30" }]}>
          <View style={[styles.impactAccent, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>Your Impact</Text>
          {!summaryLoading && (
            <View style={[styles.impactBalance, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
              <Text style={[styles.tileLabel, { color: theme.colors.mutedForeground }]}>
                Available for payout{platformFeesWithheld > 0 ? " (after platform fees)" : ""}
              </Text>
              {platformFeesWithheld > 0 && (
                <Text style={[styles.tileHint, { color: theme.colors.mutedForeground }]}>Platform fees withheld: ${platformFeesWithheld.toFixed(2)}</Text>
              )}
              <Text style={[styles.impactBalanceValue, { color: theme.colors.foreground }]}>${payoutBalance.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.impactStats}>
            <View style={[styles.statBox, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
              <Ionicons name="calendar" size={18} color={theme.colors.primary} />
              <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Events hosted</Text>
              <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{summaryLoading ? "—" : (summary?.eventsHosted ?? 0)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
              <Ionicons name="ticket" size={18} color={theme.colors.primary} />
              <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Tickets sold</Text>
              <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{summaryLoading ? "—" : (summary?.ticketsSold ?? 0)}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: theme.colors.muted, borderColor: theme.colors.border }]}>
              <Ionicons name="star" size={18} color={theme.colors.warning} />
              <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>Rating</Text>
              <Text style={[styles.statValue, { color: theme.colors.foreground }]}>4.9</Text>
            </View>
          </View>
          <View style={styles.impactActions}>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.primary }]} onPress={goToOrganizer}>
              <Ionicons name="bar-chart" size={18} color={theme.colors.primary} />
              <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>View Detailed Analytics</Text>
            </TouchableOpacity>
            {riskFlagged ? (
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.warning }]} disabled>
                <Ionicons name="alert-circle" size={18} color={theme.colors.warning} />
                <Text style={[styles.outlineBtnText, { color: theme.colors.warning }]}>Review Required</Text>
              </TouchableOpacity>
            ) : !isVerified ? (
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.muted }]} disabled>
                <Ionicons name="wallet-outline" size={18} color={theme.colors.mutedForeground} />
                <Text style={[styles.outlineBtnText, { color: theme.colors.mutedForeground }]}>Manage Payouts (verify first)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: theme.colors.primary }]} onPress={goToOrganizer}>
                <Ionicons name="wallet-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.outlineBtnText, { color: theme.colors.primary }]}>Manage Payouts</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <TouchableOpacity style={[editorialCard(theme), styles.moreRow]} onPress={() => navigation.navigate("Pricing")}>
        <Ionicons name="pricetag-outline" size={22} color={theme.colors.primary} />
        <Text style={[styles.linkText, { color: theme.colors.foreground }]}>Plans & pricing</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.md, paddingBottom: 32 },
  stitchNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  stitchBrand: { fontSize: 20, fontWeight: "800", color: "#2D2D2D" },
  stitchNavAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  stitchNavAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  heroGradient: { borderRadius: 28, padding: 24, marginBottom: 20, alignItems: "center" },
  stitchAvatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, marginBottom: 12, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  stitchAvatarImg: { width: 96, height: 96, borderRadius: 48 },
  stitchAvatarInitials: { fontSize: 32, fontWeight: "800", color: "#fff" },
  stitchAvatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 48,
  },
  stitchEditBadge: { position: "absolute", right: 4, bottom: 4, width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  stitchHeroName: { fontSize: 24, fontWeight: "800", color: "#fff", marginBottom: 4 },
  stitchHeroEmail: { fontSize: 14, color: "rgba(255,255,255,0.92)" },
  stitchMemberSince: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "rgba(255,255,255,0.95)",
    alignSelf: "flex-start",
    width: "100%",
    marginBottom: 10,
  },
  stitchBio: { fontSize: 14, color: "rgba(255,255,255,0.95)", marginTop: 10, marginBottom: 4, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  stitchHeroSub: { fontSize: 13, color: "rgba(255,255,255,0.88)", marginTop: 8, marginBottom: 8, textAlign: "center" },
  stitchHeroSubDim: { fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 4, marginBottom: 4, textAlign: "center" },
  heroStatsRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.35)",
    justifyContent: "space-between",
  },
  heroStatCell: { flex: 1, alignItems: "center" },
  heroStatNum: { fontSize: 22, fontWeight: "800", color: "#fff" },
  heroStatLab: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.85)", marginTop: 4, letterSpacing: 0.5 },
  stitchHeroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 },
  stitchPill: { backgroundColor: "rgba(255,255,255,0.28)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  stitchPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  stitchHeroLink: { marginTop: 12 },
  stitchHeroLinkText: { color: "#fff", fontWeight: "700", textDecorationLine: "underline" },
  dashHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  dashTitle: { fontSize: 18, fontWeight: "800" },
  dashManage: { color: "#b03060", fontWeight: "800", fontSize: 13 },
  dashRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  discoverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
  },
  dashCard: { flex: 1, borderRadius: 20, padding: 14 },
  dashIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  dashCardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  dashCardSub: { fontSize: 12 },
  followingBlock: { marginBottom: 20 },
  followingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingHorizontal: 4 },
  followingTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 1 },
  followingScroll: { gap: 12, paddingVertical: 4 },
  followingChip: { width: 72, alignItems: "center" },
  followingAvatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  followingAvatarPh: { justifyContent: "center", alignItems: "center" },
  followingName: { fontSize: 10, textAlign: "center", lineHeight: 13 },
  accountGrid: { padding: 16, marginBottom: 16, borderRadius: lightTheme.radius.lg },
  accountGridTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.6, marginBottom: 12 },
  accountGridRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  accountTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    minHeight: 88,
  },
  accountTileTitle: { fontSize: 14, fontWeight: "800", marginTop: 6 },
  accountTileSub: { fontSize: 11, marginTop: 2 },
  settingsCard: { padding: 0, overflow: "hidden", marginBottom: 16 },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, gap: 12 },
  settingsIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  settingsCopy: { flex: 1 },
  settingsTitle: { fontSize: 16, fontWeight: "700" },
  settingsSub: { fontSize: 13, marginTop: 2 },
  logoutBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fce7f3",
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 20,
  },
  logoutBarText: { color: "#b03060", fontWeight: "800", fontSize: 16 },
  moreRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 8 },
  heroCard: {
    padding: lightTheme.spacing.lg,
    marginBottom: lightTheme.spacing.md,
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  avatarWrap: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", overflow: "hidden" },
  avatarImage: { width: 72, height: 72, borderRadius: 36 },
  avatarText: { fontSize: 24, fontWeight: "700" },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 36,
  },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: lightTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  heroMain: { flex: 1 },
  heroName: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  specialty: { fontSize: 14, marginBottom: 8 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: lightTheme.radius.sm },
  badgeText: { fontSize: 12, fontWeight: "600" },
  badgeSuccess: { backgroundColor: lightTheme.colors.success },
  badgeWarning: { backgroundColor: lightTheme.colors.warning },
  badgeDanger: { backgroundColor: lightTheme.colors.destructive },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: lightTheme.radius.md },
  primaryBtnText: { fontSize: 15, fontWeight: "600" },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: lightTheme.radius.md, borderWidth: 1 },
  outlineBtnText: { fontSize: 14, fontWeight: "600" },
  outlineBtnSmall: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: lightTheme.radius.sm, borderWidth: 1 },
  primaryBtnSmall: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: lightTheme.radius.md, alignSelf: "flex-start" },
  alertCard: { padding: 16, borderRadius: lightTheme.radius.lg, marginBottom: 12 },
  alertTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  alertDesc: { fontSize: 14, marginBottom: 12 },
  alertText: { flex: 1 },
  alertDanger: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca" },
  alertWarning: { flexDirection: "row", gap: 12, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" },
  tiles: { gap: 10, marginBottom: 12 },
  tile: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 10 },
  tileIcon: { width: 40, height: 40, borderRadius: lightTheme.radius.md, justifyContent: "center", alignItems: "center", marginRight: 12 },
  tileContent: { flex: 1, minWidth: 0 },
  tileLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  tileValue: { fontSize: 15, fontWeight: "600" },
  tileHint: { fontSize: 12, marginTop: 2 },
  card: { padding: 16, marginBottom: 12 },
  cardRow: { flexDirection: "row", alignItems: "center" },
  tierName: { fontSize: 17, fontWeight: "700", marginBottom: 4 },
  tierDesc: { fontSize: 14, marginBottom: 8 },
  linkPrimary: { fontSize: 14, fontWeight: "600" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sectionDesc: { fontSize: 14, marginBottom: 12, color: lightTheme.colors.mutedForeground },
  impactCard: { position: "relative", overflow: "hidden", paddingLeft: 20 },
  impactAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  impactBalance: { padding: 14, borderRadius: lightTheme.radius.md, borderWidth: 1, marginBottom: 16 },
  impactBalanceValue: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  impactStats: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: { flex: 1, padding: 12, borderRadius: lightTheme.radius.md, borderWidth: 1 },
  statLabel: { fontSize: 11, marginTop: 4 },
  statValue: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  impactActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  menuCard: { marginTop: 8, overflow: "hidden" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  linkText: { flex: 1, fontSize: 16 },
  logoutText: { flex: 1, fontSize: 16 },
  guestContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: lightTheme.spacing.lg },
  guestCard: { width: "100%", maxWidth: 360, padding: 28, alignItems: "center" },
  guestIconWrap: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  guestSubtitle: { fontSize: 15, textAlign: "center", marginBottom: 24, lineHeight: 22 },
  guestButton: { width: "100%", paddingVertical: 14, borderRadius: lightTheme.radius.md, alignItems: "center", marginBottom: 12 },
  guestButtonText: { fontSize: 16, fontWeight: "600" },
  guestButtonOutline: { width: "100%", paddingVertical: 14, borderRadius: lightTheme.radius.md, borderWidth: 2, alignItems: "center" },
  guestButtonOutlineText: { fontSize: 16, fontWeight: "600" },
});
