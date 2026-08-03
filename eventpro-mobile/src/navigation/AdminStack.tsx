import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AdminStackParamList } from "./types";
import { useTheme } from "../contexts/ThemeContext";
import { AdminOverviewScreen } from "../screens/AdminOverviewScreen";
import { AdminStatsScreen } from "../screens/AdminStatsScreen";
import { AdminUsersScreen } from "../screens/AdminUsersScreen";
import { AdminVerificationScreen } from "../screens/AdminVerificationScreen";
import { AdminEventsScreen } from "../screens/AdminEventsScreen";
import { AdminEventSalesScreen } from "../screens/AdminEventSalesScreen";
import { AdminRevenueScreen } from "../screens/AdminRevenueScreen";
import { AdminSubscriptionPaymentsScreen } from "../screens/AdminSubscriptionPaymentsScreen";
import { AdminSystemHealthScreen } from "../screens/AdminSystemHealthScreen";
import { SupportAgentWorkspaceScreen } from "../screens/SupportAgentWorkspaceScreen";
import { SupportAnalyticsScreen } from "../screens/SupportAnalyticsScreen";
import { SystemMaintenanceScreen } from "../screens/SystemMaintenanceScreen";
import { TicketDetailAgentScreen } from "../screens/TicketDetailAgentScreen";
import { UserRolesManagementScreen } from "../screens/UserRolesManagementScreen";

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: { color: theme.colors.foreground },
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="AdminOverview" component={AdminOverviewScreen} options={{ title: "Admin" }} />
      <Stack.Screen name="AdminStats" component={AdminStatsScreen} options={{ title: "Platform overview" }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} options={{ title: "Events" }} />
      <Stack.Screen name="AdminEventSales" component={AdminEventSalesScreen} options={{ title: "Event sales" }} />
      <Stack.Screen name="AdminRevenue" component={AdminRevenueScreen} options={{ title: "Revenue" }} />
      <Stack.Screen name="AdminSubscriptionPayments" component={AdminSubscriptionPaymentsScreen} options={{ title: "Subscription payments" }} />
      <Stack.Screen name="AdminSystemHealth" component={AdminSystemHealthScreen} options={{ title: "System Health" }} />
      <Stack.Screen name="SystemMaintenance" component={SystemMaintenanceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportAgentWorkspace" component={SupportAgentWorkspaceScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SupportAnalytics" component={SupportAnalyticsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TicketDetailAgent" component={TicketDetailAgentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UserRolesManagement" component={UserRolesManagementScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
