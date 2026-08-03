import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import type { MainTabParamList } from "./types";
import { useAuth } from "../context/AuthContext";
import { DiscoverStack } from "./DiscoverStack";
import { SearchStack } from "./SearchStack";
import { TicketsStack } from "./TicketsStack";
import { ProfileStack } from "./ProfileStack";
import { OrganizerStack } from "./OrganizerStack";
import { AdminStack } from "./AdminStack";
import { useTheme } from "../contexts/ThemeContext";

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isOrganizer = user?.role === "ORGANIZER" || user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: { backgroundColor: theme.colors.card, borderTopColor: theme.colors.border },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverStack}
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchStack}
        options={{
          title: "Search",
          tabBarLabel: "Search",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsStack}
        options={{
          title: "Tickets",
          tabBarLabel: "Tickets",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "ticket" : "ticket-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate("Profile", { screen: "ProfileHome" });
          },
        })}
      />
      {isOrganizer && (
        <Tab.Screen
          name="Organizer"
          component={OrganizerStack}
          options={{
            title: "Organizer",
            tabBarLabel: "Organizer",
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
          }}
        />
      )}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminStack}
          options={{
            title: "Admin",
            tabBarLabel: "Admin",
            tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color} />,
          }}
        />
      )}
    </Tab.Navigator>
  );
}
