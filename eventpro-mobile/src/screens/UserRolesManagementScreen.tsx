import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";

const PURPLE = "#6236FF";
const BG = "#faf8ff";

const ROLES = [
  {
    id: "1",
    title: "Platform Admin",
    desc: "Unrestricted access to all system settings, user data, and financial records.",
    users: "3 Users",
    badge: "SYSTEM DEFAULT",
    highlight: true,
    icon: "shield-checkmark" as const,
  },
  {
    id: "2",
    title: "Support Lead",
    desc: "Ticket escalation, dispute resolution, and customer communications.",
    users: "12 Users",
    icon: "headset" as const,
  },
  {
    id: "3",
    title: "Event Reviewer",
    desc: "Audit events and approve ticket releases before they go live.",
    users: "8 Users",
    icon: "shield-outline" as const,
  },
  {
    id: "4",
    title: "Standard User",
    desc: "Purchase tickets and manage personal profiles.",
    users: "4.2k Users",
    icon: "person-outline" as const,
  },
];

export function UserRolesManagementScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} hitSlop={12}>
          <Ionicons name="menu" size={26} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Roles</Text>
        <View style={[styles.miniAv, { backgroundColor: theme.colors.muted }]}>
          <Ionicons name="person" size={18} color={theme.colors.mutedForeground} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>MANAGEMENT CONSOLE</Text>
        <Text style={styles.pageHead}>Permission Control</Text>
        <Text style={[styles.sub, { color: theme.colors.mutedForeground }]}>
          Define and manage access levels across your digital ecosystem.
        </Text>

        {ROLES.map((r) => (
          <View
            key={r.id}
            style={[
              editorialCard(theme),
              styles.roleCard,
              r.highlight ? styles.roleCardHi : { backgroundColor: theme.colors.primary + "08" },
            ]}
          >
            {r.highlight ? <View style={styles.decorBlue} /> : null}
            <View style={styles.roleTop}>
              <Ionicons name={r.icon} size={26} color={PURPLE} />
              {!r.highlight ? (
                <TouchableOpacity hitSlop={12}>
                  <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.mutedForeground} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 20 }} />
              )}
            </View>
            <Text style={[styles.roleTitle, { color: theme.colors.foreground }]}>{r.title}</Text>
            <Text style={[styles.roleDesc, { color: theme.colors.mutedForeground }]}>{r.desc}</Text>
            <View style={styles.roleMeta}>
              <Text style={{ fontWeight: "800", color: theme.colors.foreground }}>{r.users}</Text>
              {r.badge ? (
                <View style={styles.sysBadge}>
                  <Text style={styles.sysBadgeText}>{r.badge}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.editBtn, r.highlight ? { backgroundColor: PURPLE } : { backgroundColor: theme.colors.primary + "18" }]}
              activeOpacity={0.9}
            >
              <Ionicons name="pencil" size={18} color={r.highlight ? "#fff" : PURPLE} />
              <Text style={[styles.editBtnText, { color: r.highlight ? "#fff" : PURPLE }]}>Edit Role</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 20 }]}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.card }]}>
        {[
          { icon: "grid-outline" as const, label: "Dashboard", route: "AdminOverview" },
          { icon: "people-outline" as const, label: "Users", route: "AdminUsers" },
          { icon: "shield-outline" as const, label: "Roles", active: true },
          { icon: "settings-outline" as const, label: "Settings", route: "AdminSystemHealth" },
        ].map((t) => (
          <TouchableOpacity
            key={t.label}
            style={[styles.navItem, t.active && { backgroundColor: PURPLE + "18" }]}
            onPress={() => t.route && navigation.navigate(t.route)}
          >
            <Ionicons name={t.icon} size={22} color={t.active ? PURPLE : "#9ca3af"} />
            <Text style={[styles.navLbl, { color: t.active ? PURPLE : "#9ca3af" }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#0A0A0A" },
  miniAv: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9333ea",
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 8,
  },
  pageHead: { fontSize: 26, fontWeight: "900", color: "#0A0A0A", marginHorizontal: 16, marginTop: 4 },
  sub: { marginHorizontal: 16, marginBottom: 16, marginTop: 8, lineHeight: 20 },
  roleCard: { marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 20, overflow: "hidden" },
  roleCardHi: { backgroundColor: "#fff" },
  decorBlue: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#dbeafe",
    opacity: 0.6,
  },
  roleTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  roleTitle: { fontSize: 18, fontWeight: "900" },
  roleDesc: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  roleMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" },
  sysBadge: { backgroundColor: PURPLE + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sysBadgeText: { fontSize: 11, fontWeight: "900", color: PURPLE },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  editBtnText: { fontWeight: "800", fontSize: 15 },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9d5ff",
  },
  navItem: { alignItems: "center", padding: 8, borderRadius: 14, minWidth: 72 },
  navLbl: { fontSize: 9, fontWeight: "800", marginTop: 4 },
});
