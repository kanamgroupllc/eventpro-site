import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

const ADMIN_CARDS = [
  { title: "Agent Workspace", description: "Support queue, live chats, and ticket summary (Stitch)", route: "SupportAgentWorkspace" as const },
  { title: "Support Analytics", description: "CSAT, resolution trends, and agent performance", route: "SupportAnalytics" as const },
  { title: "Ticket detail (agent)", description: "Support view: ticket, payment, internal history", route: "TicketDetailAgent" as const },
  { title: "System Maintenance", description: "Windows, emergency controls, notifications (Stitch)", route: "SystemMaintenance" as const },
  { title: "System Health", description: "Infrastructure status, latency, and regional health", route: "AdminSystemHealth" as const },
  { title: "Overview", description: "Platform stats: users, events, tickets, revenue", route: "AdminStats" as const },
  { title: "User Management", description: "Manage users, roles, permissions", route: "AdminUsers" as const },
  { title: "User Roles", description: "Permission control & role templates (Stitch)", route: "UserRolesManagement" as const },
  { title: "Verification (KYC)", description: "Review and approve identity verification", route: "AdminVerification" as const },
  { title: "Events", description: "View all events on the platform", route: "AdminEvents" as const },
  { title: "Event Sales", description: "Tickets sold and revenue per event", route: "AdminEventSales" as const },
  { title: "Revenue", description: "Revenue and tickets sold over time", route: "AdminRevenue" as const },
  { title: "Subscription payments", description: "Record offline subscription payment", route: "AdminSubscriptionPayments" as const },
];

export function AdminOverviewScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const { user } = useAuth();

  if (user?.role !== "ADMIN") {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.forbidden, { color: theme.colors.mutedForeground }]}>Admin only.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.headerIconText}>🛡</Text>
        </View>
        <View>
          <Text style={[sectionLabel(theme), { marginBottom: 4 }]}>Console</Text>
          <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>Welcome, {user?.firstName ?? "Admin"}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        {ADMIN_CARDS.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={[editorialCard(theme), styles.card]}
            onPress={() => navigation.navigate(card.route)}
            activeOpacity={0.8}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>{card.title}</Text>
            <Text style={[styles.cardDesc, { color: theme.colors.mutedForeground }]}>{card.description}</Text>
            <Text style={[styles.cardArrow, { color: theme.colors.primary }]}>→</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.lg, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  forbidden: { fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 },
  headerIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  headerIconText: { fontSize: 24 },
  subtitle: { fontSize: 14, marginTop: 2 },
  grid: { gap: 12 },
  card: {
    padding: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: "600" },
  cardDesc: { fontSize: 13, marginTop: 4 },
  cardArrow: { fontSize: 18, marginTop: 8, fontWeight: "600" },
});
