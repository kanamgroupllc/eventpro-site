import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { TicketsStackParamList } from "./types";
import { useTheme } from "../contexts/ThemeContext";
import { OrderHistoryScreen } from "../screens/OrderHistoryScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { MyWalletScreen } from "../screens/MyWalletScreen";
import { PaymentStatusScreen } from "../screens/PaymentStatusScreen";
import { RefundSuccessScreen } from "../screens/RefundSuccessScreen";

const Stack = createNativeStackNavigator<TicketsStackParamList>();

/**
 * Tickets tab — orders & QR / ticket view (Stitch bottom nav).
 */
export function TicketsStack() {
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
      <Stack.Screen name="TicketsHome" component={OrderHistoryScreen} options={{ title: "Tickets" }} />
      <Stack.Screen name="MyWallet" component={MyWalletScreen} options={{ title: "My Wallet" }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: "View ticket" }} />
      <Stack.Screen
        name="PaymentStatus"
        component={PaymentStatusScreen}
        options={{ title: "Payment Status", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="RefundSuccess"
        component={RefundSuccessScreen}
        options={{ title: "Refund", headerBackTitle: "Back" }}
      />
    </Stack.Navigator>
  );
}
