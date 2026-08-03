import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import type { PendingVerification } from "@eventpro/shared";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";
import { RejectionReasonModal } from "../components/RejectionReasonModal";

const PURPLE = "#5D3FD3";
const BG = "#F5F3FF";

type Tab = "pending" | "approved" | "rejected";

export function AdminVerificationScreen({ navigation }: { navigation: { navigate: (n: string) => void } }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { api } = useAuth();
  const [list, setList] = useState<PendingVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectForId, setRejectForId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  const load = async () => {
    try {
      const data = await api.getVerificationPending(50);
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = (submissionId: string) => {
    Alert.alert("Approve", "Approve this verification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setActingId(submissionId);
          try {
            await api.approveVerification(submissionId);
            await load();
          } catch {
            Alert.alert("Error", "Failed to approve.");
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  };

  const confirmReject = async (reason: string) => {
    if (!rejectForId) return;
    const submissionId = rejectForId;
    setRejectForId(null);
    setActingId(submissionId);
    try {
      await api.rejectVerification(submissionId, reason);
      await load();
    } catch {
      Alert.alert("Error", "Failed to reject.");
    } finally {
      setActingId(null);
    }
  };

  const filtered = tab === "pending" ? list : [];

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: BG }]}>
        <ActivityIndicator size="large" color={PURPLE} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <RejectionReasonModal
        visible={rejectForId != null}
        onClose={() => setRejectForId(null)}
        onConfirm={confirmReject}
        submitting={actingId != null}
      />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate("AdminOverview")}>
          <Ionicons name="menu" size={26} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.brand}>KanamEvents</Text>
        <View style={[styles.av, { backgroundColor: theme.colors.muted }]}>
          <Ionicons name="person" size={18} color={theme.colors.mutedForeground} />
        </View>
      </View>

      <View style={styles.titleRow}>
        <View>
          <Text style={styles.portalLbl}>INTERNAL PORTAL</Text>
          <Text style={styles.pageTitle}>Verification</Text>
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{list.length} Pending</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.primary + "14" }]}>
          <Text style={styles.statLbl}>KYC COMPLETED</Text>
          <Text style={styles.statBig}>84%</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: PURPLE }]}>
          <Text style={styles.statLblLight}>AVG. RESPONSE</Text>
          <Text style={styles.statBigLight}>1.4h</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(
          [
            { id: "pending" as const, label: "Pending" },
            { id: "approved" as const, label: "Approved" },
            { id: "rejected" as const, label: "Rejected" },
          ] as const
        ).map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && { backgroundColor: PURPLE }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && { color: "#fff" }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.queueHint, { color: theme.colors.mutedForeground }]}>
        {tab === "pending" ? `${list.length} Pending Requests` : "Switch to Pending for live queue"}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          tab !== "pending" ? (
            <Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>Use Pending tab for the review queue.</Text>
          ) : (
            <Text style={[styles.empty, { color: theme.colors.mutedForeground }]}>No pending verifications.</Text>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={PURPLE} />
        }
        renderItem={({ item, index }) => {
          const busy = actingId === item.id;
          const urgent = index === 0 && list.length > 0;
          const le = (item.legalEntityType ?? "").toLowerCase();
          const isBiz = le.includes("business") || le.includes("llc") || le.includes("corp");
          return (
            <View style={[editorialCard(theme), styles.card, urgent && styles.cardUrgent]}>
              {urgent ? (
                <View style={styles.urgentRibbon}>
                  <Text style={styles.urgentText}>URGENT</Text>
                </View>
              ) : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.logoSq, { backgroundColor: theme.colors.muted }]}>
                  <Ionicons name={isBiz ? "business" : "person"} size={22} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
                    {isBiz ? item.email?.split("@")[0] ?? "Business" : item.email ?? "Applicant"}
                  </Text>
                  <Text style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                    {isBiz ? "Business Identity Verification" : "Individual Promoter (KYC)"}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.mutedForeground} />
                    <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.mutedForeground }}>
                      REQUESTED {index === 0 ? "4M AGO" : "2H AGO"}
                    </Text>
                  </View>
                </View>
              </View>
              {isBiz && urgent ? (
                <View style={[styles.attachRow, { backgroundColor: theme.colors.primary + "12" }]}>
                  <Ionicons name="document-text-outline" size={18} color={PURPLE} />
                  <Text style={{ flex: 1, fontSize: 13, color: theme.colors.foreground }}>Tax_ID_2024.pdf</Text>
                  <Text style={{ color: PURPLE, fontWeight: "800" }}>VIEW</Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.rejectFull, { borderColor: theme.colors.primary }]}
                  onPress={() => setRejectForId(item.id)}
                  disabled={busy}
                >
                  <Text style={{ color: PURPLE, fontWeight: "800" }}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.approveFull, { backgroundColor: PURPLE }, busy && { opacity: 0.6 }]}
                  onPress={() => handleApprove(item.id)}
                  disabled={busy}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>{isBiz ? "Approve Agent" : "Approve KYC"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 11, fontWeight: "800", marginBottom: 8 }}>
        END OF CURRENT QUEUE
      </Text>
      <TouchableOpacity style={{ alignSelf: "center", marginBottom: insets.bottom + 56 }}>
        <Text style={{ color: PURPLE, fontWeight: "800" }}>LOAD MORE RECORDS ⌄</Text>
      </TouchableOpacity>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 6, backgroundColor: theme.colors.card }]}>
        {[
          { icon: "home-outline" as const, label: "Home", route: "AdminOverview" },
          { icon: "search-outline" as const, label: "Search", route: "AdminEvents" },
          { icon: "ticket-outline" as const, label: "Tickets", route: "AdminEventSales" },
          { icon: "grid-outline" as const, label: "Admin", route: "AdminOverview", active: true },
          { icon: "person-outline" as const, label: "Profile", route: "AdminStats" },
        ].map((b) => (
          <TouchableOpacity
            key={b.label}
            style={[styles.bnItem, b.active && { backgroundColor: PURPLE + "18" }]}
            onPress={() => navigation.navigate(b.route)}
          >
            <Ionicons name={b.icon} size={20} color={b.active ? PURPLE : "#9ca3af"} />
            <Text style={[styles.bnLbl, { color: b.active ? PURPLE : "#9ca3af" }]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8 },
  brand: { fontSize: 18, fontWeight: "900", color: PURPLE },
  av: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, marginTop: 8 },
  portalLbl: { fontSize: 10, fontWeight: "900", color: PURPLE, letterSpacing: 1 },
  pageTitle: { fontSize: 28, fontWeight: "900", color: "#0A0A0A" },
  pendingBadge: { backgroundColor: PURPLE + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  pendingBadgeText: { fontWeight: "800", color: PURPLE, fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginTop: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 16 },
  statLbl: { fontSize: 10, fontWeight: "900", color: "#6b7280" },
  statBig: { fontSize: 28, fontWeight: "900", color: "#111", marginTop: 4 },
  statLblLight: { fontSize: 10, fontWeight: "900", color: "rgba(255,255,255,0.85)" },
  statBigLight: { fontSize: 28, fontWeight: "900", color: "#fff", marginTop: 4 },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: "center", backgroundColor: "#fff" },
  tabText: { fontWeight: "800", color: PURPLE, fontSize: 13 },
  queueHint: { marginHorizontal: 16, marginTop: 8, fontSize: 12 },
  list: { padding: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, padding: 16 },
  empty: { textAlign: "center", marginTop: 24 },
  card: { padding: 16, marginBottom: 14, borderRadius: 20 },
  cardUrgent: { borderWidth: 1, borderColor: "#fecaca" },
  urgentRibbon: {
    position: "absolute",
    top: 12,
    right: -24,
    backgroundColor: "#881337",
    paddingHorizontal: 28,
    paddingVertical: 4,
    transform: [{ rotate: "45deg" }],
  },
  urgentText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  logoSq: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 12, borderRadius: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  rejectFull: { flex: 1, borderWidth: 2, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  approveFull: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: "center" },
  bottomNav: {
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
  bnItem: { alignItems: "center", padding: 6, borderRadius: 10, minWidth: 52 },
  bnLbl: { fontSize: 8, fontWeight: "800", marginTop: 2 },
});
