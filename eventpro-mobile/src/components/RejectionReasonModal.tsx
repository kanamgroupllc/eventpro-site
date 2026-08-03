import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import type { Theme } from "../theme";

const CATEGORIES = [
  "Incomplete Documents",
  "Invalid Business ID",
  "Risk Policy Violation",
  "Fraudulent Activity",
  "Expired License",
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting?: boolean;
};

export function RejectionReasonModal({ visible, onClose, onConfirm, submitting }: Props) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [selected, setSelected] = useState<string | null>(null);
  const [comments, setComments] = useState("");

  const confirm = () => {
    const parts = [selected, comments.trim()].filter(Boolean);
    const reason = parts.join("\n\n") || "Rejected by admin.";
    onConfirm(reason);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: theme.colors.primary + "35" }]} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: theme.colors.foreground }]}>Rejection Reason</Text>
                <Text style={[styles.sheetSub, { color: theme.colors.mutedForeground }]}>
                  Select the primary reason for declining this organizer.
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={26} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>COMMON CATEGORIES</Text>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => {
                  const isOn = selected === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: theme.colors.primary + "18",
                          borderColor: isOn ? theme.colors.primary : "transparent",
                          borderWidth: isOn ? 2 : 0,
                        },
                      ]}
                      onPress={() => setSelected(isOn ? null : c)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.chipText, { color: theme.colors.foreground }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.commentsHeader}>
                <Text style={[styles.sectionLabel, { color: theme.colors.primary }]}>ADDITIONAL COMMENTS</Text>
                <Text style={[styles.optional, { color: theme.colors.mutedForeground }]}>Optional</Text>
              </View>
              <TextInput
                style={[
                  styles.textarea,
                  {
                    backgroundColor: theme.colors.primary + "12",
                    color: theme.colors.foreground,
                    borderColor: theme.colors.border,
                  },
                ]}
                placeholder="Provide specific details or a personal message to the organizer regarding the next steps..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                value={comments}
                onChangeText={setComments}
                textAlignVertical="top"
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }, submitting && styles.disabled]}
              onPress={confirm}
              disabled={submitting}
              activeOpacity={0.92}
            >
              <View style={styles.confirmInner}>
                <View style={styles.warnIcon}>
                  <Ionicons name="alert" size={16} color={theme.colors.primary} />
                </View>
                <Text style={[styles.confirmText, { color: theme.colors.primaryForeground }]}>Confirm Rejection</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={[styles.cancelText, { color: theme.colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1, justifyContent: "flex-end" },
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(30, 30, 46, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: 20,
      paddingBottom: 28,
      paddingTop: 10,
      maxHeight: "92%",
    },
    handle: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 12 },
    sheetHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 16 },
    sheetTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
    sheetSub: { fontSize: 14, lineHeight: 20 },
    sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.8, marginBottom: 10 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
    },
    chipText: { fontSize: 14, fontWeight: "600" },
    commentsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    optional: { fontSize: 13 },
    textarea: {
      minHeight: 120,
      borderRadius: 16,
      padding: 14,
      fontSize: 15,
      lineHeight: 22,
      borderWidth: 1,
      marginBottom: 20,
    },
    confirmBtn: {
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    confirmInner: { flexDirection: "row", alignItems: "center", gap: 10 },
    warnIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#fff",
      justifyContent: "center",
      alignItems: "center",
    },
    confirmText: { fontSize: 16, fontWeight: "800" },
    cancelBtn: { paddingVertical: 14, alignItems: "center" },
    cancelText: { fontSize: 16, fontWeight: "600" },
    disabled: { opacity: 0.65 },
  });
}
