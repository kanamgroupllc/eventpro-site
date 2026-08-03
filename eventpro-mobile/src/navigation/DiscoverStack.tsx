import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { DiscoverStackParamList } from "./types";
import { useTheme } from "../contexts/ThemeContext";
import { HomeScreen } from "../screens/HomeScreen";
import { EventsListScreen } from "../screens/EventsListScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { CheckoutScreen } from "../screens/CheckoutScreen";
import { SelectSeatsScreen } from "../screens/SelectSeatsScreen";
import { SelectTicketsScreen } from "../screens/SelectTicketsScreen";
import { TikTokShareSaveScreen, TikTokShareTemplateScreen } from "../screens/TikTokShareScreens";

const Stack = createNativeStackNavigator<DiscoverStackParamList>();

export function DiscoverStack() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.card },
        headerTintColor: theme.colors.foreground,
        headerTitleStyle: { color: theme.colors.foreground },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="EventsList"
        component={EventsListScreen}
        options={({ route }) => ({ title: (route.params as { organizerId?: string })?.organizerId ? "More from this organizer" : "Events" })}
      />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ title: "Event" }} />
      <Stack.Screen name="SelectTickets" component={SelectTicketsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SelectSeats" component={SelectSeatsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
      <Stack.Screen name="TikTokShareTemplate" component={TikTokShareTemplateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TikTokShareSave" component={TikTokShareSaveScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
