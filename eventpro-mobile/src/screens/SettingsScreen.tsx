import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useNotificationPreferences } from "../contexts/NotificationPreferencesContext";
import { useRecentlyViewed } from "../contexts/RecentlyViewedContext";
import { useTheme } from "../contexts/ThemeContext";
import Constants from "expo-constants";
import { lightTheme } from "../theme";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

const STITCH_BG = "#F8F4FF";
const SECTION_HDR = "#881337";

export function SettingsScreen({ navigation }: { navigation: any }) {
  const { logout, api, user } = useAuth();
  const { theme, colorScheme, setColorScheme } = useTheme();
  const { notificationPreferences, setNotificationPreferences } = useNotificationPreferences();
  const { clearRecentlyViewed } = useRecentlyViewed();
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    setPrefsLoading(true);
    api
      .getMyNotificationPreferences()
      .then((p) => setNotificationPreferences({ inAppNotifications: p.pushEnabled }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, [api]);

  const handleInAppChange = async (v: boolean) => {
    setNotificationPreferences({ inAppNotifications: v });
    try {
      await api.updateMyNotificationPreferences({ pushEnabled: v });
    } catch {
      setNotificationPreferences({ inAppNotifications: !v });
    }
  };

  const openWeb = (path: string) => {
    Linking.openURL(`${WEB_URL}${path}`).catch(() => {});
  };

  const openMail = () => {
    Linking.openURL("mailto:support@kanamevents.com?subject=KanamEvents%20Support").catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: STITCH_BG }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileHero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.bigAvatar, { backgroundColor: theme.colors.muted }]}>
            <Ionicons name="person" size={40} color={theme.colors.mutedForeground} />
          </View>
          <TouchableOpacity style={[styles.editAvBtn, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="pencil" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={[styles.profileName, { color: theme.colors.foreground }]}>
          {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Your account"}
        </Text>
        <Text style={[styles.profileEmail, { color: theme.colors.mutedForeground }]}>{user?.email ?? ""}</Text>
        <TouchableOpacity
          style={[styles.editProfileBtn, { backgroundColor: theme.colors.primary + "18" }]}
          onPress={() => navigation.navigate("ProfileEdit")}
        >
          <Text style={[styles.editProfileBtnText, { color: theme.colors.primary }]}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusMini, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="shield-checkmark" size={22} color="#fff" />
          <Text style={styles.statusMiniText}>Security Score: 95%</Text>
        </View>
        <View style={[styles.statusMini, { backgroundColor: "#fce7f3" }]}>
          <Ionicons name="notifications" size={22} color="#9d174d" />
          <Text style={[styles.statusMiniText, { color: "#9d174d" }]}>12 New Alerts</Text>
        </View>
      </View>

      <Text style={[styles.stitchSection, { color: SECTION_HDR }]}>ACCOUNT & SECURITY</Text>
      {/* Account */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="person" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Account</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>Profile, orders & subscription</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("ProfileEdit")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Edit profile</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("OrderHistory")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Order history</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("Pricing")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Pricing & subscription</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Support & contact */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="help-buoy" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Support</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>Get help or contact us</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("HelpCenter")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Help center</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={openMail}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Contact us (email)</Text>
          <Ionicons name="mail-outline" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => openWeb("/contact")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Contact page (web)</Text>
          <Ionicons name="open-outline" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("Privacy")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Data & privacy</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.stitchSection, { color: SECTION_HDR, marginTop: 8 }]}>NOTIFICATIONS</Text>
      {/* Notifications */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="notifications" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Notifications</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>Choose how we contact you</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.row, { borderTopColor: theme.colors.border }]} onPress={() => navigation.navigate("Notifications")}>
          <Text style={[styles.rowText, { color: theme.colors.foreground }]}>View notifications</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
        </TouchableOpacity>
        <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Order confirmations (email)</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>When you buy tickets</Text>
          </View>
          <Switch
            value={notificationPreferences.emailOrderConfirmations}
            onValueChange={(v) => setNotificationPreferences({ emailOrderConfirmations: v })}
            trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "80" }}
            thumbColor={theme.colors.card}
          />
        </View>
        <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Marketing & tips (email)</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>News and offers</Text>
          </View>
          <Switch
            value={notificationPreferences.emailMarketing}
            onValueChange={(v) => setNotificationPreferences({ emailMarketing: v })}
            trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "80" }}
            thumbColor={theme.colors.card}
          />
        </View>
        <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Event reminders (email)</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>Before events you attend</Text>
          </View>
          <Switch
            value={notificationPreferences.emailEventReminders}
            onValueChange={(v) => setNotificationPreferences({ emailEventReminders: v })}
            trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "80" }}
            thumbColor={theme.colors.card}
          />
        </View>
        <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>In-app notifications</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>When you're in the app</Text>
          </View>
          <Switch
            value={notificationPreferences.inAppNotifications}
            onValueChange={handleInAppChange}
            disabled={prefsLoading}
            trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "80" }}
            thumbColor={theme.colors.card}
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="color-palette" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Appearance</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>Switch between light and dark mode</Text>
          </View>
        </View>
        <View style={[styles.row, { borderTopColor: theme.colors.border }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Dark mode</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>
              {colorScheme === "dark" ? "On" : "Off"}
            </Text>
          </View>
          <Switch
            value={colorScheme === "dark"}
            onValueChange={(v) => setColorScheme(v ? "dark" : "light")}
            trackColor={{ false: theme.colors.muted, true: theme.colors.primary + "80" }}
            thumbColor={theme.colors.card}
          />
        </View>
      </View>

      {/* Privacy */}
      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="shield-checkmark" size={22} color={theme.colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Privacy</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>Recently viewed events are stored on this device.</Text>
          </View>
        </View>
        <View style={[styles.row, { borderTopColor: theme.colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
          <View style={styles.switchLabel}>
            <Text style={[styles.rowText, { color: theme.colors.foreground }]}>Recently viewed events</Text>
            <Text style={[styles.rowSubtext, { color: theme.colors.mutedForeground }]}>Clear your recently viewed events list</Text>
          </View>
          <TouchableOpacity
            onPress={clearRecentlyViewed}
            style={[styles.clearBtn, { borderColor: theme.colors.border }]}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.foreground} />
            <Text style={[styles.clearBtnText, { color: theme.colors.foreground }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log out */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme.colors.destructive + "18", borderColor: theme.colors.destructive + "40" }]}
        onPress={() => logout()}
      >
        <Ionicons name="log-out-outline" size={22} color={theme.colors.destructive} />
        <Text style={[styles.logoutBtnText, { color: theme.colors.destructive }]}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.lg, paddingBottom: 32 },
  profileHero: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 14,
    alignItems: "center",
  },
  avatarRow: { position: "relative", marginBottom: 12 },
  bigAvatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center" },
  editAvBtn: {
    position: "absolute",
    right: -4,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileName: { fontSize: 20, fontWeight: "800" },
  profileEmail: { fontSize: 14, marginTop: 4 },
  editProfileBtn: { marginTop: 14, alignSelf: "stretch", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  editProfileBtnText: { fontWeight: "800", fontSize: 16 },
  statusRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statusMini: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 16,
  },
  statusMiniText: { fontSize: 12, fontWeight: "800", color: "#fff", flex: 1 },
  stitchSection: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    borderRadius: lightTheme.radius.lg,
    borderWidth: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: lightTheme.spacing.md },
  iconWrap: { width: 44, height: 44, borderRadius: lightTheme.radius.md, justifyContent: "center", alignItems: "center", marginRight: 14 },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardDesc: { fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: lightTheme.spacing.md,
    borderTopWidth: 1,
  },
  rowText: { fontSize: 16 },
  switchLabel: { flex: 1 },
  rowSubtext: { fontSize: 12, marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: lightTheme.radius.lg,
    borderWidth: 1,
    marginTop: 8,
  },
  logoutBtnText: { fontSize: 16, fontWeight: "600" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: lightTheme.radius.md,
    borderWidth: 1,
  },
  clearBtnText: { fontSize: 15, fontWeight: "600" },
});
