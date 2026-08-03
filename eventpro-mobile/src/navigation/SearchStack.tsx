import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import type { SearchStackParamList } from "./types";
import { useTheme } from "../contexts/ThemeContext";
import { EventsListScreen } from "../screens/EventsListScreen";
import { EventDetailScreen } from "../screens/EventDetailScreen";
import { CheckoutScreen } from "../screens/CheckoutScreen";
import { SelectSeatsScreen } from "../screens/SelectSeatsScreen";
import { SelectTicketsScreen } from "../screens/SelectTicketsScreen";
import { TikTokShareSaveScreen, TikTokShareTemplateScreen } from "../screens/TikTokShareScreens";

const Stack = createNativeStackNavigator<SearchStackParamList>();

/**
 * Search tab — same event discovery flow as Discover; root is the full events list + search.
 */
export function SearchStack() {
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
      <Stack.Screen
        name="SearchHome"
        component={EventsListScreen}
        initialParams={{ stitchSearchUi: true }}
        options={{
          title: "Search Events",
          headerRight: () => (
            <Ionicons name="options-outline" size={22} color={theme.colors.primary} style={{ marginRight: 14 }} />
          ),
        }}
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
