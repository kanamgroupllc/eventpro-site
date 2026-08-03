import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ProfileStackParamList } from "./types";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ProfileEditScreen } from "../screens/ProfileEditScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { OrderHistoryScreen } from "../screens/OrderHistoryScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { FollowingScreen } from "../screens/FollowingScreen";
import { PricingScreen } from "../screens/PricingScreen";
import { PrivacyScreen } from "../screens/PrivacyScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { HelpCenterScreen } from "../screens/HelpCenterScreen";
import { LiveChatSupportScreen } from "../screens/LiveChatSupportScreen";
import { BrandLogo } from "../components/BrandLogo";
import { useTheme } from "../contexts/ThemeContext";

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
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
        name="ProfileHome"
        component={ProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: "Edit profile" }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: "Settings",
          headerRight: () => <BrandLogo size={44} style={{ marginRight: 10 }} />,
        }}
      />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifications" }} />
      <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: "Orders" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "View Ticket" }} />
      <Stack.Screen name="Following" component={FollowingScreen} options={{ title: "Following" }} />
      <Stack.Screen name="Pricing" component={PricingScreen} options={{ title: "Pricing" }} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: "Privacy" }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: "Help Center" }} />
      <Stack.Screen
        name="LiveChatSupport"
        component={LiveChatSupportScreen}
        options={{ title: "Event Support", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
