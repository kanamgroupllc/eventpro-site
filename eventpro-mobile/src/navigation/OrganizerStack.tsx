import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { OrganizerStackParamList } from "./types";
import { useTheme } from "../contexts/ThemeContext";
import { OrganizerDashboardScreen } from "../screens/OrganizerDashboardScreen";
import { OrganizerEventDetailScreen } from "../screens/OrganizerEventDetailScreen";
import { EventTicketsScreen } from "../screens/EventTicketsScreen";
import { EventEnhancementsScreen } from "../screens/EventEnhancementsScreen";
import { CheckInScreen } from "../screens/CheckInScreen";
import { QRScannerScreen } from "../screens/QRScannerScreen";
import { SeatMapEditorScreen } from "../screens/SeatMapEditorScreen";
import { CreateEventWizardScreen } from "../screens/CreateEventWizardScreen";
import { OrganizerEventInsightsScreen } from "../screens/OrganizerEventInsightsScreen";

const Stack = createNativeStackNavigator<OrganizerStackParamList>();

export function OrganizerStack() {
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
      <Stack.Screen name="OrganizerDashboard" component={OrganizerDashboardScreen} options={{ title: "Organizer" }} />
      <Stack.Screen
        name="OrganizerEventInsights"
        component={OrganizerEventInsightsScreen}
        options={{ title: "Event insights" }}
      />
      <Stack.Screen name="OrganizerEventDetail" component={OrganizerEventDetailScreen} options={{ title: "Event" }} />
      <Stack.Screen name="EventTickets" component={EventTicketsScreen} options={{ title: "Tickets" }} />
      <Stack.Screen name="EventEnhancements" component={EventEnhancementsScreen} options={{ title: "Enhancements" }} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} options={{ headerShown: false }} />
      <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: "Scan ticket" }} />
      <Stack.Screen name="SeatMapEditor" component={SeatMapEditorScreen} options={{ title: "Seat map" }} />
      <Stack.Screen name="CreateEventWizard" component={CreateEventWizardScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
