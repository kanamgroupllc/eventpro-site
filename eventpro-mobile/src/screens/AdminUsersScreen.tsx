import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { User } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard } from "../theme/screenStyles";

const PURPLE = "#5D3FD3";
const BG = "#faf8ff";

const ROLE_CHIPS = ["All", "Attendees", "Organizers", "Admins"] as const;
const STATUS_CHIPS = [
  { id: "Active", color: "#16a34a", bg: "#dcfce7" },
  { id: "Pending", color: "#ea580c", bg: "#ffedd5" },
  { id: "Suspended", color: "#dc2626", bg: "#fee2e2" },
] as const;

function roleLabel(role: string): string {
  if (role === "USER") return "Attendee";
  if (role === "ORGANIZER") return "Organizer";
  if (role === "ADMIN") return "Admin";
  return role;
}

function statusStyle(status: string | undefined) {
  const s = (status ?? "").toUpperCase();
  if (s === "ACTIVE" || !s) return STATUS_CHIPS[0];
  if (s.includes("PENDING")) return STATUS_CHIPS[1];
  if (s.includes("SUSPEND")) return STATUS_CHIPS[2];
  return STATUS_CHIPS[0];
}

export function AdminUsersScreen({ navigation }: { navigation: { navigate: (n: string) => void } }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { api } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [roleChip, setRoleChip] = useState<(typeof ROLE_CHIPS)[number]>("All");

  const load = async (pageNum = 0) => {
    try {
      const res = await api.getUsersPage(pageNum + 1, 50);
      setUsers(res.content ?? []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const matchQ = !q || name.includes(q) || email.includes(q);
      let matchRole = true;
      if (roleChip === "Attendees") matchRole = u.role === "USER";
      if (roleChip === "Organizers") matchRole = u.role === "ORGANIZER";
      if (roleChip === "Admins") matchRole = u.role === "ADMIN";
      return matchQ && matchRole;
    });
  }, [users, query, roleChip]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="menu" size={26} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>User Management</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="search" size={24} color="#0A0A0A" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: theme.colors.primary + "12" }]}>
        <Ionicons name="search" size={20} color={PURPLE} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.foreground }]}
          placeholder="Search by name or email..."
          placeholderTextColor={theme.colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <Text style={styles.chipSectionLbl}>USER ROLES</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {ROLE_CHIPS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.chip, roleChip === r && { backgroundColor: PURPLE }]}
            onPress={() => setRoleChip(r)}
          >
            <Text style={[styles.chipText, roleChip === r && { color: "#fff" }]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.chipSectionLbl}>STATUS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_CHIPS.map((s) => (
          <View key={s.id} style={[styles.statusChip, { backgroundColor: s.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: s.color }]} />
            <Text style={[styles.statusChipText, { color: s.color }]}>{s.id}</Text>
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.recentLbl, { color: theme.colors.foreground }]}>Recent Users</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={<Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No users match.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(0);
            }}
            tintColor={PURPLE}
            colors={[PURPLE]}
          />
        }
        renderItem={({ item, index }) => {
          const st = statusStyle(item.status);
          const role = roleLabel(item.role);
          const added = ["2d ago", "5h ago", "1w ago", "3d ago"][index % 4];
          return (
            <View style={[editorialCard(theme), styles.userCard]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.muted }]}>
                <Ionicons name="person" size={22} color={theme.colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: theme.colors.foreground }]}>
                  {[item.firstName, item.lastName].filter(Boolean).join(" ") || "—"}
                </Text>
                <Text style={[styles.userEmail, { color: theme.colors.mutedForeground }]}>{item.email}</Text>
                <View style={styles.tagRow}>
                  <View style={[styles.roleTag, { backgroundColor: PURPLE + "18" }]}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: PURPLE }}>{role}</Text>
                  </View>
                  <View style={[styles.roleTag, { backgroundColor: st.bg }]}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: st.color }}>{item.status ?? "Active"}</Text>
                  </View>
                </View>
                <Text style={styles.addedMeta}>ADDED {added.toUpperCase()}</Text>
              </View>
              <TouchableOpacity hitSlop={12}>
                <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 72 }]} activeOpacity={0.9}>
        <Ionicons name="person-add" size={26} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.adminBottomNav, { paddingBottom: insets.bottom + 6, backgroundColor: theme.colors.card }]}>
        {(
          [
            { icon: "calendar-outline" as const, label: "Events", route: "AdminEvents" as const },
            { icon: "people" as const, label: "Users", route: "AdminUsers" as const },
            { icon: "cash-outline" as const, label: "Sales", route: "AdminEventSales" as const },
            { icon: "settings-outline" as const, label: "Settings", route: "AdminOverview" as const },
          ] as const
        ).map((t) => {
          const active = t.route === "AdminUsers";
          return (
            <TouchableOpacity
              key={t.label}
              style={[styles.adminNavItem, active && { backgroundColor: PURPLE + "18" }]}
              onPress={() => navigation.navigate(t.route)}
            >
              <Ionicons name={t.icon} size={22} color={active ? PURPLE : "#9ca3af"} />
              <Text style={[styles.adminNavLbl, { color: active ? PURPLE : "#9ca3af" }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: lightTheme.spacing.md,
    paddingVertical: 12,
  },
  pageTitle: { fontSize: 18, fontWeight: "900", color: "#0A0A0A" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: lightTheme.spacing.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chipSectionLbl: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    marginLeft: lightTheme.spacing.md,
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  chipRow: { paddingHorizontal: lightTheme.spacing.md, gap: 8, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  chipText: { fontWeight: "800", color: "#6b7280", fontSize: 13 },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 12, fontWeight: "800" },
  recentLbl: { fontSize: 16, fontWeight: "900", marginLeft: lightTheme.spacing.md, marginTop: 16, marginBottom: 8 },
  list: { padding: lightTheme.spacing.md, paddingTop: 0, paddingBottom: 120 },
  emptyList: { flexGrow: 1, padding: lightTheme.spacing.md },
  empty: { textAlign: "center", marginTop: 24 },
  userCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, marginBottom: 10, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center" },
  userName: { fontSize: 16, fontWeight: "800" },
  userEmail: { fontSize: 13, marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  addedMeta: { fontSize: 10, fontWeight: "800", color: "#9ca3af", marginTop: 8, letterSpacing: 0.5 },
  adminBottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9d5ff",
  },
  adminNavItem: { alignItems: "center", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, minWidth: 64 },
  adminNavLbl: { fontSize: 9, fontWeight: "800", marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
