import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { lightTheme } from "../theme";
import { editorialCard, sectionLabel } from "../theme/screenStyles";

export function AdminSubscriptionPaymentsScreen() {
  const { theme } = useTheme();
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[sectionLabel(theme), { marginBottom: 12 }]}>Offline payments</Text>
      <View style={[editorialCard(theme), styles.card]}>
        <Text style={[styles.desc, { color: theme.colors.mutedForeground }]}>
          Record offline or wire subscription payments here. Stripe subscriptions are recorded automatically. Use the web app to record manual subscription payments.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: lightTheme.spacing.lg, paddingBottom: 40 },
  card: { padding: 16 },
  desc: { fontSize: 15, lineHeight: 22 },
});
