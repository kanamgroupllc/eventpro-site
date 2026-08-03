import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../contexts/ThemeContext";
import { editorialCard } from "../theme/screenStyles";

const BG = "#F8F4FF";
const PURPLE = "#5D3FD3";

const WEB_URL = Constants.expoConfig?.extra?.webUrl ?? process.env.EXPO_PUBLIC_WEB_URL ?? "https://eventpro.com";

export function SystemMaintenanceScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [notifyAll, setNotifyAll] = useState(true);
  const [notifyOrg, setNotifyOrg] = useState(false);
  const [notifyAdmins, setNotifyAdmins] = useState(true);
  const [tab, setTab] = useState<"health" | "logs" | "settings">("logs");

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#0A0A0A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Maintenance</Text>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE STATUS</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroLbl}>Current Platform State</Text>
          <View style={styles.operationalRow}>
            <Ionicons name="checkmark-circle" size={36} color="#fff" />
            <Text style={styles.operational}>Operational</Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Enable Maintenance Mode</Text>
              <Text style={styles.toggleSub}>Redirects users to status page.</Text>
            </View>
            <Switch
              value={maintenanceMode}
              onValueChange={setMaintenanceMode}
              trackColor={{ false: "#ccc", true: "#a78bfa" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Scheduled Windows</Text>
          <TouchableOpacity>
            <Text style={styles.addNew}>ADD NEW</Text>
          </TouchableOpacity>
        </View>
        {[
          { title: "Database Optimization", date: "OCT 24", time: "02:00 AM", dur: "2.5 Hours" },
          { title: "Edge Node Security Patch", date: "NOV 12", time: "11:00 PM", dur: "45 Mins" },
        ].map((w) => (
          <TouchableOpacity key={w.title} style={[editorialCard(theme), styles.windowCard]}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateBadgeText}>{w.date}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.winTitle, { color: theme.colors.foreground }]}>{w.title}</Text>
              <Text style={{ color: theme.colors.mutedForeground, fontSize: 13 }}>
                {w.time} · {w.dur}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        ))}

        <View style={styles.emergency}>
          <View style={styles.emergencyHead}>
            <Ionicons name="warning" size={20} color="#dc2626" />
            <Text style={styles.emergencyLbl}>IMMEDIATE ACTION</Text>
          </View>
          <Text style={styles.emergencyTitle}>Emergency Shutdown</Text>
          <Text style={styles.emergencySub}>Broadcast alert & cut traffic instantly.</Text>
          <TouchableOpacity style={styles.emergencyBtn}>
            <Text style={styles.emergencyBtnText}>Trigger Emergency Mode</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginBottom: 10 }]}>Notification Audience</Text>
        <View style={[editorialCard(theme), { marginHorizontal: 16, padding: 14 }]}>
          {[
            ["All Platform Users", notifyAll, setNotifyAll] as const,
            ["Organizers Only", notifyOrg, setNotifyOrg] as const,
            ["System Admins Only", notifyAdmins, setNotifyAdmins] as const,
          ].map(([label, val, set]) => (
            <TouchableOpacity key={label} style={styles.checkRow} onPress={() => set(!val)}>
              <View style={[styles.checkbox, val && styles.checkboxOn]}>
                {val ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <Text style={{ color: theme.colors.foreground, fontWeight: "600" }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginHorizontal: 16, marginTop: 20, marginBottom: 10 }]}>Past Maintenance</Text>
        <View style={[editorialCard(theme), { marginHorizontal: 16, padding: 16 }]}>
          {[
            { title: "Global Load Balancer Reset", status: "SUCCESS", date: "Oct 05, 2023", ok: true },
            { title: "API v3 Deprecation", status: "SUCCESS", date: "Sep 28, 2023", ok: true },
            {
              title: "Elasticsearch Migration",
              status: "ROLLBACK",
              date: "Sep 15, 2023",
              ok: false,
              note: "Index mismatch — 12 min rollback.",
            },
          ].map((e) => (
            <View key={e.title} style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: e.ok ? "#16a34a" : "#dc2626" }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "800", color: theme.colors.foreground }}>{e.title}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: e.ok ? "#16a34a" : "#dc2626" }}>{e.status}</Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.colors.mutedForeground }}>{e.date}</Text>
                {"note" in e && e.note ? <Text style={{ fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 }}>{e.note}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={{ alignSelf: "center", marginTop: 16 }}
          onPress={() => Linking.openURL(`${WEB_URL}/admin/audit-logs`).catch(() => {})}
        >
          <Text style={{ color: PURPLE, fontWeight: "800" }}>View Audit Logs</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.bottomNav, { paddingBottom: insets.bottom + 8, backgroundColor: theme.colors.card }]}>
        {(
          [
            { id: "health" as const, icon: "shield-outline" as const, label: "Health" },
            { id: "logs" as const, icon: "document-text-outline" as const, label: "Logs" },
            { id: "settings" as const, icon: "settings-outline" as const, label: "Settings" },
          ] as const
        ).map((t) => (
          <TouchableOpacity key={t.id} style={[styles.navItem, tab === t.id && styles.navActive]} onPress={() => setTab(t.id)}>
            <Ionicons name={t.icon} size={22} color={tab === t.id ? PURPLE : "#9ca3af"} />
            <Text style={[styles.navLabel, { color: tab === t.id ? PURPLE : "#9ca3af" }]}>{t.label}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#0A0A0A", flex: 1, textAlign: "center" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" },
  liveText: { fontSize: 10, fontWeight: "800", color: "#0A0A0A" },
  hero: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    backgroundColor: PURPLE,
    marginBottom: 20,
  },
  heroLbl: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  operationalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  operational: { fontSize: 28, fontWeight: "900", color: "#fff" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
  },
  toggleTitle: { color: "#fff", fontWeight: "700", fontSize: 15 },
  toggleSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 4 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0A0A0A" },
  addNew: { color: PURPLE, fontWeight: "800", fontSize: 13 },
  windowCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  dateBadge: {
    backgroundColor: PURPLE + "22",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
  },
  dateBadgeText: { fontSize: 11, fontWeight: "800", color: PURPLE },
  winTitle: { fontSize: 15, fontWeight: "800" },
  emergency: {
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#f87171",
    backgroundColor: "#fef2f2",
  },
  emergencyHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  emergencyLbl: { color: "#dc2626", fontWeight: "900", fontSize: 12 },
  emergencyTitle: { fontSize: 18, fontWeight: "900", color: "#991b1b" },
  emergencySub: { fontSize: 13, color: "#b91c1c", marginBottom: 12 },
  emergencyBtn: { backgroundColor: "#dc2626", paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  emergencyBtnText: { color: "#fff", fontWeight: "900" },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxOn: { backgroundColor: PURPLE },
  timelineRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
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
  navItem: { alignItems: "center", padding: 10, borderRadius: 16, minWidth: 72 },
  navActive: { backgroundColor: PURPLE + "18" },
  navLabel: { fontSize: 10, fontWeight: "800", marginTop: 4 },
});
