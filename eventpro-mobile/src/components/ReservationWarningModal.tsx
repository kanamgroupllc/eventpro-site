import React from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";

type Props = {
  visible: boolean;
  minutesLeft: number;
  onKeepReservation: () => void;
  onCancel: () => void;
};

export function ReservationWarningModal({ visible, minutesLeft, onKeepReservation, onCancel }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.iconWrap, { backgroundColor: "#fce7f3" }]}>
            <Ionicons name="warning" size={36} color="#dc2626" />
          </View>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>Your reservation is expiring soon!</Text>
          <Text style={[styles.body, { color: theme.colors.mutedForeground }]}>
            You have{" "}
            <Text style={styles.urgent}>
              {minutesLeft} {minutesLeft === 1 ? "minute" : "minutes"}
            </Text>{" "}
            left to complete your purchase. Would you like to extend it?
          </Text>
          <TouchableOpacity style={[styles.primary, { backgroundColor: theme.colors.primary }]} onPress={onKeepReservation} activeOpacity={0.92}>
            <Text style={[styles.primaryText, { color: theme.colors.primaryForeground }]}>Keep Reservation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={onCancel}>
            <Text style={[styles.secondaryText, { color: theme.colors.mutedForeground }]}>CANCEL</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(30, 20, 50, 0.55)",
      justifyContent: "center",
      padding: 24,
    },
    sheet: {
      borderRadius: 24,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 8,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    title: { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 12 },
    body: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: 24 },
    urgent: { color: "#b91c1c", fontWeight: "800" },
    primary: {
      width: "100%",
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginBottom: 12,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 4,
    },
    primaryText: { fontSize: 16, fontWeight: "800" },
    secondary: { paddingVertical: 12 },
    secondaryText: { fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  });
}
